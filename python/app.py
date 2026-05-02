"""HireSense AI — Flask reference backend.

Run:
    python init_db.py
    python app.py

NOTE: For demo simplicity this uses a header `X-User-Id` instead of full auth.
In production wire this up to JWT (e.g. Supabase Auth) or Flask-Login.
"""
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

from db import get_db, init_schema
from parser import parse_resume
from nlp import extract_skills, extract_certifications, extract_experience, estimate_ats_score
from matcher import rank_jobs, learning_plan

app = Flask(__name__)
CORS(app)
init_schema()


def current_user_id() -> int:
    uid = request.headers.get("X-User-Id")
    if not uid:
        return 0
    try:
        return int(uid)
    except ValueError:
        return 0


# -------------------- Resume --------------------
@app.post("/upload_resume")
def upload_resume():
    uid = current_user_id()
    if not uid:
        return jsonify({"error": "Missing X-User-Id"}), 401
    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400
    f = request.files["file"]
    text = parse_resume(f.filename, f.read())
    if len(text.strip()) < 50:
        return jsonify({"error": "Resume text too short"}), 400

    skills = extract_skills(text)
    experience = extract_experience(text)
    certs = extract_certifications(text)
    score = estimate_ats_score(text, skills)

    with get_db() as c:
        cur = c.execute(
            """INSERT INTO resumes (user_id, file_name, raw_text, skills, experience, ats_score)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (uid, f.filename, text[:50000], json.dumps(skills), json.dumps(experience), score["total"]),
        )
        resume_id = cur.lastrowid
        # Store certifications, dedupe by name
        existing = {r["name"].lower() for r in c.execute(
            "SELECT name FROM certifications WHERE user_id = ?", (uid,))}
        for cert in certs:
            if cert["name"].lower() not in existing:
                c.execute(
                    """INSERT INTO certifications (user_id, name, issuing_org, source, resume_id)
                       VALUES (?, ?, ?, 'resume', ?)""",
                    (uid, cert["name"], cert["issuing_org"], resume_id),
                )

    return jsonify({
        "resume_id": resume_id,
        "skills": skills,
        "experience": experience,
        "certifications": certs,
        "ats_score": score["total"],
        "score_breakdown": score,
    })


# -------------------- Jobs / Matching --------------------
@app.get("/jobs")
def list_jobs():
    with get_db() as c:
        rows = c.execute("SELECT * FROM jobs WHERE is_active = 1 ORDER BY created_at DESC").fetchall()
    return jsonify([dict(r) for r in rows])


@app.get("/match_jobs")
def match_jobs():
    uid = current_user_id()
    if not uid:
        return jsonify({"error": "Missing X-User-Id"}), 401
    with get_db() as c:
        resume = c.execute(
            "SELECT * FROM resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1", (uid,)
        ).fetchone()
        if not resume:
            return jsonify({"error": "Upload a resume first"}), 400
        applied_ids = {r["job_id"] for r in c.execute(
            "SELECT job_id FROM applications WHERE user_id = ?", (uid,))}
        jobs = [dict(r) for r in c.execute(
            "SELECT * FROM jobs WHERE is_active = 1").fetchall()]

    candidates = [j for j in jobs if j["id"] not in applied_ids]
    skills = json.loads(resume["skills"] or "[]")
    ranked = rank_jobs(resume["raw_text"] or "", skills, candidates)
    return jsonify({"jobs": ranked[:12], "total": len(candidates)})


@app.post("/apply_job")
def apply_job():
    uid = current_user_id()
    if not uid:
        return jsonify({"error": "Missing X-User-Id"}), 401
    body = request.get_json(silent=True) or {}
    job_id = body.get("job_id")
    score = body.get("match_score")
    if not job_id:
        return jsonify({"error": "job_id required"}), 400
    with get_db() as c:
        try:
            c.execute(
                "INSERT INTO applications (user_id, job_id, match_score) VALUES (?, ?, ?)",
                (uid, job_id, score),
            )
        except Exception as e:
            return jsonify({"error": str(e)}), 400
    return jsonify({"ok": True})


@app.get("/applied_jobs")
def applied_jobs():
    uid = current_user_id()
    if not uid:
        return jsonify({"error": "Missing X-User-Id"}), 401
    with get_db() as c:
        rows = c.execute(
            """SELECT a.id, a.match_score, a.status, a.created_at,
                      j.id AS job_id, j.title, j.company, j.location
               FROM applications a JOIN jobs j ON j.id = a.job_id
               WHERE a.user_id = ? ORDER BY a.created_at DESC""", (uid,)
        ).fetchall()
    return jsonify([dict(r) for r in rows])


# -------------------- Certifications --------------------
@app.get("/certifications")
def list_certs():
    uid = current_user_id()
    if not uid:
        return jsonify({"error": "Missing X-User-Id"}), 401
    with get_db() as c:
        rows = c.execute(
            "SELECT * FROM certifications WHERE user_id = ? ORDER BY created_at DESC", (uid,)
        ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.post("/certifications")
def add_cert():
    uid = current_user_id()
    if not uid:
        return jsonify({"error": "Missing X-User-Id"}), 401
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    with get_db() as c:
        cur = c.execute(
            "INSERT INTO certifications (user_id, name, issuing_org, source) VALUES (?, ?, ?, 'manual')",
            (uid, name[:200], (body.get("issuing_org") or None)),
        )
    return jsonify({"id": cur.lastrowid})


@app.delete("/certifications/<int:cert_id>")
def delete_cert(cert_id):
    uid = current_user_id()
    if not uid:
        return jsonify({"error": "Missing X-User-Id"}), 401
    with get_db() as c:
        c.execute("DELETE FROM certifications WHERE id = ? AND user_id = ?", (cert_id, uid))
    return jsonify({"ok": True})


# -------------------- Learning Plan --------------------
@app.get("/learning_plan")
def get_learning_plan():
    uid = current_user_id()
    if not uid:
        return jsonify({"error": "Missing X-User-Id"}), 401
    target_job_id = request.args.get("job_id", type=int)
    with get_db() as c:
        resume = c.execute(
            "SELECT skills FROM resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1", (uid,)
        ).fetchone()
        if not resume:
            return jsonify({"error": "Upload a resume first"}), 400
        if target_job_id:
            job = c.execute("SELECT required_skills FROM jobs WHERE id = ?", (target_job_id,)).fetchone()
            target_skills = json.loads(job["required_skills"]) if job else []
        else:
            # default: aggregate top in-demand skills across all jobs
            all_jobs = c.execute("SELECT required_skills FROM jobs WHERE is_active = 1").fetchall()
            counter = {}
            for j in all_jobs:
                for s in json.loads(j["required_skills"]):
                    counter[s] = counter.get(s, 0) + 1
            target_skills = [s for s, _ in sorted(counter.items(), key=lambda x: -x[1])[:15]]
    plan = learning_plan(json.loads(resume["skills"] or "[]"), target_skills)
    return jsonify(plan)


# -------------------- Employer --------------------
@app.post("/post_job")
def post_job():
    uid = current_user_id()
    if not uid:
        return jsonify({"error": "Missing X-User-Id"}), 401
    body = request.get_json(silent=True) or {}
    required = ["title", "company", "description", "required_skills"]
    if not all(body.get(k) for k in required):
        return jsonify({"error": f"Missing one of {required}"}), 400
    with get_db() as c:
        cur = c.execute(
            """INSERT INTO jobs (title, company, location, description, required_skills,
               experience_level, experience_years_min, salary_min, salary_max, employer_id, source)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'employer')""",
            (
                body["title"][:120], body["company"][:120], body.get("location"),
                body["description"][:5000], json.dumps(body["required_skills"]),
                body.get("experience_level"), int(body.get("experience_years_min") or 0),
                body.get("salary_min"), body.get("salary_max"), uid,
            ),
        )
    return jsonify({"id": cur.lastrowid})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
