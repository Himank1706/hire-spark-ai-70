"""Initialize SQLite schema and seed jobs."""
import json
from db import init_schema, get_db

SEED_JOBS = [
    ("Frontend Developer", "Acme Corp", "Remote", "Build modern web UIs with React and TypeScript.",
     ["React", "TypeScript", "HTML", "CSS", "Tailwind", "Git"], "Mid", 2, 70000, 95000),
    ("Senior React Engineer", "Lumen Labs", "San Francisco, CA", "Lead frontend architecture, mentor juniors.",
     ["React", "TypeScript", "Redux", "Next.js", "Jest", "GraphQL"], "Senior", 5, 130000, 170000),
    ("Full Stack Developer", "Brightwave", "Remote", "Own features end-to-end across Node.js APIs and React.",
     ["Node.js", "React", "PostgreSQL", "AWS", "TypeScript", "REST"], "Mid", 3, 90000, 120000),
    ("Backend Engineer (Python)", "DataForge", "Berlin", "Design scalable APIs in Python.",
     ["Python", "Django", "PostgreSQL", "Redis", "Docker", "REST"], "Mid", 3, 75000, 105000),
    ("Junior Web Developer", "Pixel Studio", "Remote", "Entry-level role building marketing websites.",
     ["HTML", "CSS", "JavaScript", "Git"], "Junior", 0, 45000, 60000),
    ("Data Scientist", "InsightAI", "New York, NY", "Build ML models for churn and recommendation.",
     ["Python", "Pandas", "scikit-learn", "SQL", "Statistics", "TensorFlow"], "Mid", 3, 110000, 145000),
    ("Machine Learning Engineer", "NeuroStack", "Remote", "Productionize ML models.",
     ["Python", "PyTorch", "Docker", "Kubernetes", "AWS", "MLOps"], "Senior", 4, 130000, 175000),
    ("Data Analyst", "MetricsHub", "London", "Analyze product data, build dashboards.",
     ["SQL", "Python", "Tableau", "Excel", "Statistics"], "Junior", 1, 55000, 75000),
    ("DevOps Engineer", "CloudNine", "Remote", "Manage CI/CD, Kubernetes clusters, cloud infra.",
     ["AWS", "Kubernetes", "Docker", "Terraform", "Linux", "CI/CD"], "Mid", 3, 100000, 140000),
    ("Mobile Developer (React Native)", "GoMobile", "Remote", "Cross-platform mobile apps.",
     ["React Native", "TypeScript", "iOS", "Android", "Redux"], "Mid", 2, 80000, 110000),
    ("UX/UI Designer", "Designly", "Remote", "Figma, prototyping, design systems.",
     ["Figma", "UX", "UI", "Prototyping", "Design Systems"], "Mid", 3, 70000, 95000),
    ("Product Manager", "OrbitProd", "Seattle, WA", "Own product roadmap for a B2B SaaS.",
     ["Product Management", "Agile", "Jira", "Analytics", "Roadmapping"], "Senior", 5, 120000, 160000),
    ("QA Automation Engineer", "Testify", "Remote", "Cypress and Playwright automated tests.",
     ["JavaScript", "Cypress", "Playwright", "Selenium", "CI/CD"], "Mid", 2, 70000, 95000),
    ("Java Backend Developer", "Enterprixe", "Dublin", "Spring Boot microservices.",
     ["Java", "Spring Boot", "PostgreSQL", "Kafka", "Docker"], "Mid", 4, 75000, 105000),
    ("Cybersecurity Analyst", "SecuraNet", "Washington, DC", "Monitor and respond to security incidents.",
     ["Security", "SIEM", "Networking", "Linux", "Python"], "Mid", 3, 95000, 130000),
    ("Site Reliability Engineer", "NinesCloud", "Remote", "Own platform reliability.",
     ["Linux", "Kubernetes", "Prometheus", "Grafana", "Go", "AWS"], "Senior", 5, 130000, 170000),
    ("Data Engineer", "Pipeline.io", "Remote", "Spark and Airflow pipelines.",
     ["Python", "Spark", "Airflow", "SQL", "AWS", "Kafka"], "Mid", 3, 105000, 140000),
    ("AI Research Engineer", "OpenMinds", "Zurich", "Research and prototype LLM systems.",
     ["Python", "PyTorch", "Transformers", "NLP", "LLM", "Research"], "Senior", 4, 140000, 190000),
    ("Junior Data Analyst", "StartGrowth", "Remote", "Entry-level analytics role.",
     ["SQL", "Excel", "Python", "Statistics"], "Junior", 0, 45000, 60000),
    ("Junior Frontend Developer", "Webcrafters", "Remote", "Entry-level React UIs.",
     ["React", "JavaScript", "HTML", "CSS", "Git"], "Junior", 0, 50000, 70000),
]


def seed():
    init_schema()
    with get_db() as c:
        cur = c.execute("SELECT COUNT(*) AS n FROM jobs")
        if cur.fetchone()["n"] > 0:
            print("Jobs already seeded.")
            return
        for (title, company, loc, desc, skills, lvl, yrs, smin, smax) in SEED_JOBS:
            c.execute(
                """INSERT INTO jobs (title, company, location, description, required_skills,
                   experience_level, experience_years_min, salary_min, salary_max, source)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed')""",
                (title, company, loc, desc, json.dumps(skills), lvl, yrs, smin, smax),
            )
        print(f"Seeded {len(SEED_JOBS)} jobs.")


if __name__ == "__main__":
    seed()
