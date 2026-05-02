"""NLP — skill, certification and experience extraction with spaCy + curated dictionaries."""
import re
import spacy

# Lazy load spaCy
_nlp = None
def nlp():
    global _nlp
    if _nlp is None:
        _nlp = spacy.load("en_core_web_sm")
    return _nlp


# Curated skill taxonomy (extend in production)
SKILL_BANK = {
    # programming languages
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust", "kotlin",
    "swift", "php", "ruby", "scala", "r", "sql", "html", "css", "bash", "shell",
    # frameworks
    "react", "next.js", "vue", "angular", "svelte", "react native", "flutter",
    "node.js", "express", "django", "flask", "fastapi", "spring boot", "rails",
    "tailwind", "bootstrap", "redux",
    # data / ml
    "pandas", "numpy", "scikit-learn", "scikit learn", "tensorflow", "pytorch",
    "transformers", "spacy", "nltk", "matplotlib", "seaborn", "tableau", "power bi",
    "airflow", "spark", "hadoop", "kafka", "etl", "mlops",
    # cloud / devops
    "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "jenkins",
    "ci/cd", "linux", "git", "github actions",
    # databases
    "postgresql", "mysql", "mongodb", "redis", "sqlite", "dynamodb",
    # other
    "rest", "graphql", "grpc", "agile", "scrum", "jira", "figma",
    "communication", "leadership", "problem solving",
}

CERT_PATTERNS = [
    re.compile(r"(?:certified\s+(?:in\s+)?|certificate\s+(?:in\s+|of\s+)?|certification\s+(?:in\s+)?)([A-Z][\w\-\s]{2,60})", re.I),
    re.compile(r"\b(AWS\s+Certified[\w\s]{0,40})", re.I),
    re.compile(r"\b(Microsoft\s+Certified[\w\s]{0,40})", re.I),
    re.compile(r"\b(Google\s+(?:Cloud|Data|Professional)[\w\s]{0,40})", re.I),
    re.compile(r"\b(Cisco\s+Certified[\w\s]{0,40})", re.I),
    re.compile(r"\b(PMP|CISSP|CFA|CPA|CSM|ITIL|Six Sigma|TOGAF)\b", re.I),
]

ISSUER_HINTS = ["aws", "amazon", "microsoft", "google", "cisco", "ibm", "oracle",
                "coursera", "udemy", "edx", "linkedin", "datacamp", "pluralsight"]


def extract_skills(text: str) -> list[str]:
    text_l = text.lower()
    found = set()
    for skill in SKILL_BANK:
        # word-boundary match
        if re.search(r"(?<![\w+])" + re.escape(skill) + r"(?![\w+])", text_l):
            found.add(skill.title() if skill not in {"sql", "html", "css", "rest", "etl"} else skill.upper())
    return sorted(found)


def extract_certifications(text: str) -> list[dict]:
    results = []
    seen = set()
    for pat in CERT_PATTERNS:
        for m in pat.finditer(text):
            name = m.group(1).strip(" .,;:-").strip()
            key = name.lower()
            if not name or key in seen or len(name) < 3:
                continue
            seen.add(key)
            issuer = next((h.title() for h in ISSUER_HINTS if h in key), "")
            results.append({"name": name[:200], "issuing_org": issuer})
    return results


def extract_experience(text: str) -> list[dict]:
    """Lightweight experience extraction using NER for ORG + nearby titles."""
    doc = nlp()(text[:30000])
    out = []
    seen = set()
    for ent in doc.ents:
        if ent.label_ == "ORG":
            company = ent.text.strip()
            if company.lower() in seen or len(company) < 2:
                continue
            seen.add(company.lower())
            # crude title heuristic — line containing ORG
            line = next((ln for ln in text.splitlines() if company in ln), "")
            out.append({
                "company": company[:120],
                "title": line.replace(company, "").strip(" -|,:")[:120] or "Role",
                "duration": "",
            })
    return out[:10]


def estimate_ats_score(text: str, skills: list[str]) -> dict:
    """Heuristic ATS scoring matching the rubric in the live app."""
    text_l = text.lower()
    score = {
        "skills": min(40, len(skills) * 2),
        "experience": 12 + (8 if re.search(r"\b\d+\s*\+?\s*years?\b", text_l) else 0),
        "keywords": min(20, sum(1 for kw in ["led", "built", "designed", "improved",
                                              "reduced", "increased", "managed", "shipped",
                                              "owned", "delivered"] if kw in text_l) * 2),
        "education": 8 if re.search(r"\b(bachelor|master|phd|b\.tech|m\.tech|bca|mca)\b", text_l) else 4,
        "formatting": 8 if 300 < len(text) < 8000 else 5,
    }
    score["total"] = sum(v for k, v in score.items() if k != "total")
    return score
