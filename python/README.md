# HireSense AI — Flask + spaCy + scikit-learn Reference Backend

This folder contains a **parallel reference implementation** of the HireSense AI backend in Python (Flask + spaCy + scikit-learn + SQLite), matching the spec from the project brief.

> ⚠️ The live Lovable preview runs on the React + TypeScript edge-function stack. This Python code is **for academic submission, local dev, and architecture reference**. It is not executed by the Lovable sandbox.

## Stack

- **Flask** — REST API
- **SQLite** — local database (`hiresense.db`)
- **spaCy** (`en_core_web_sm`) — NLP for skill / cert / experience extraction
- **scikit-learn** — TF-IDF + cosine similarity for job matching
- **PyPDF2** + **python-docx** — resume text extraction
- **Flask-CORS** — cross-origin support for React frontend

## Setup

```bash
cd python
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python init_db.py        # creates schema + seeds jobs
python app.py            # http://localhost:5000
```

## API

| Method | Endpoint               | Purpose                                   |
|--------|------------------------|-------------------------------------------|
| POST   | /upload_resume         | Upload PDF/DOCX, extract & store          |
| GET    | /match_jobs            | Top-N jobs ranked vs latest resume        |
| POST   | /apply_job             | Apply to a job                            |
| GET    | /applied_jobs          | List applied jobs                         |
| GET    | /certifications        | List user certifications                  |
| POST   | /certifications        | Add manual certification                  |
| DELETE | /certifications/:id    | Remove certification                      |
| GET    | /learning_plan         | Skill-gap roadmap for a target role       |
| POST   | /post_job              | Employer creates a job                    |
| GET    | /jobs                  | Public job list                           |

## Files

- `app.py` — Flask routes
- `db.py` — SQLite schema + helpers
- `init_db.py` — schema + 30 seeded jobs
- `nlp.py` — spaCy skill/cert/experience extraction
- `matcher.py` — TF-IDF + cosine similarity matching, learning plan logic
- `parser.py` — PDF / DOCX → raw text
- `requirements.txt` — pinned deps

## Data flow (mirrors the live app)

1. `POST /upload_resume` → parser extracts text → spaCy extracts skills, experience, certifications → stored in SQLite.
2. `GET /match_jobs` → builds TF-IDF over (resume + every job's title/desc/skills) → cosine sim + skill-overlap %, ranked, applied jobs excluded.
3. `POST /apply_job` → recorded in `applications`, removed from future recommendations.
4. `GET /learning_plan` → diff between resume skills & target role skills → returns missing skills + recommended courses.

This matches the TypeScript edge functions deployed in production 1:1.
