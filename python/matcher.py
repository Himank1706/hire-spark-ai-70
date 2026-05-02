"""TF-IDF + cosine similarity matcher and learning-plan logic."""
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def rank_jobs(resume_text: str, resume_skills: list[str], jobs: list[dict]) -> list[dict]:
    """Hybrid: 60% skill overlap + 40% TF-IDF cosine similarity."""
    if not jobs:
        return []
    docs = [resume_text + " " + " ".join(resume_skills)]
    for j in jobs:
        skills = j["required_skills"]
        if isinstance(skills, str):
            skills = json.loads(skills)
        docs.append(f"{j['title']} {j['description']} {' '.join(skills)}")

    vec = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=5000)
    matrix = vec.fit_transform(docs)
    sims = cosine_similarity(matrix[0:1], matrix[1:]).flatten()  # 0..1

    resume_lower = {s.lower().strip() for s in resume_skills}
    ranked = []
    for j, sim in zip(jobs, sims):
        skills = j["required_skills"]
        if isinstance(skills, str):
            skills = json.loads(skills)
        matched = [s for s in skills if s.lower().strip() in resume_lower]
        missing = [s for s in skills if s.lower().strip() not in resume_lower]
        overlap = len(matched) / len(skills) if skills else 0
        score = round((overlap * 0.6 + sim * 0.4) * 100)
        ranked.append({
            **j,
            "required_skills": skills,
            "match_score": score,
            "skill_overlap_pct": round(overlap * 100),
            "tfidf_similarity": round(float(sim), 3),
            "matched_skills": matched,
            "missing_skills": missing,
        })
    ranked.sort(key=lambda x: x["match_score"], reverse=True)
    return ranked


# Course catalog for learning plan (simplified)
COURSE_CATALOG = {
    "python": [("Python for Everybody", "Coursera"), ("Automate the Boring Stuff", "Udemy")],
    "react": [("React – The Complete Guide", "Udemy"), ("Epic React", "Kent C. Dodds")],
    "typescript": [("TypeScript Deep Dive", "Free book"), ("Total TypeScript", "Matt Pocock")],
    "aws": [("AWS Solutions Architect Associate", "AWS Training")],
    "docker": [("Docker Mastery", "Udemy")],
    "kubernetes": [("Kubernetes for Developers", "LFD259 (Linux Foundation)")],
    "sql": [("SQL for Data Science", "Coursera")],
    "machine learning": [("Machine Learning Specialization", "Andrew Ng / Coursera")],
    "tensorflow": [("DeepLearning.AI TensorFlow Developer", "Coursera")],
    "pytorch": [("PyTorch for Deep Learning", "fast.ai")],
}


def learning_plan(resume_skills: list[str], target_skills: list[str]) -> dict:
    """Diff resume vs target role → roadmap."""
    have = {s.lower().strip() for s in resume_skills}
    missing = [s for s in target_skills if s.lower().strip() not in have]
    weeks = []
    for i, skill in enumerate(missing):
        courses = COURSE_CATALOG.get(skill.lower(), [])
        weeks.append({
            "week": i + 1,
            "skill": skill,
            "courses": [{"title": t, "provider": p} for (t, p) in courses[:2]],
            "milestone": f"Build a small project using {skill}",
        })
    return {
        "have_skills": sorted(have),
        "missing_skills": missing,
        "weekly_plan": weeks,
        "estimated_weeks": len(missing),
    }
