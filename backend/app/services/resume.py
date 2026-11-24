import json

from app.schemas.assistant import ResumeContent, ResumeItem


def parse_resume_content(response: str) -> ResumeContent:
    """Parse and validate structured resume content returned by the LLM."""
    start = response.find("{")
    end = response.rfind("}")
    if start < 0 or end < start:
        raise ValueError("The model response did not contain a JSON resume.")
    return ResumeContent.model_validate(json.loads(response[start : end + 1]))


def latex_escape(value: str) -> str:
    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    return "".join(replacements.get(char, char) for char in value)


def _section(title: str, content: list[str]) -> str:
    if not content:
        return ""
    return "\n".join(
        [
            f"\\section*{{{latex_escape(title)}}}",
            "\\begin{itemize}[leftmargin=*, itemsep=2pt]",
            *[f"\\item {line}" for line in content],
            "\\end{itemize}",
        ]
    )


def _format_item(item: ResumeItem) -> str:
    heading_parts = [latex_escape(item.title)]
    if item.organization:
        heading_parts.append(latex_escape(item.organization))
    heading = r" \textbar{} ".join(heading_parts)
    if item.dates:
        heading += rf" \hfill {latex_escape(item.dates)}"
    if item.location:
        heading += rf"\\\small {latex_escape(item.location)}"
    rendered = rf"\textbf{{{heading}}}\\[-2pt]"
    if item.details:
        details = [r"\begin{itemize}[leftmargin=*, itemsep=1pt]"]
        details.extend(rf"\item {latex_escape(detail)}" for detail in item.details)
        details.append(r"\end{itemize}")
        rendered += "\n" + "\n".join(details)
    return rendered


def build_resume_latex(resume: ResumeContent) -> str:
    """Build compilable LaTeX from the exact structured content used by preview."""
    contact = resume.contact
    name = latex_escape(contact.name or "Resume")
    contact_lines = [
        latex_escape(value)
        for value in (
            contact.email,
            contact.phone,
            contact.location,
            contact.website,
            contact.linkedin,
            contact.github,
        )
        if value.strip()
    ]

    sections = []
    if resume.summary.strip():
        sections.append(
            "\n".join(
                [
                    r"\section*{Career Objective / Professional Summary}",
                    latex_escape(resume.summary),
                ]
            )
        )

    skills = [
        rf"\textbf{{{latex_escape(group.category)}}}: "
        + ", ".join(latex_escape(skill) for skill in group.skills)
        for group in resume.technical_skills
        if group.skills
    ]
    if skills:
        sections.append(_section("Technical Skills", skills))

    for title, items in (
        ("Education", resume.education),
        ("Projects", resume.projects),
        ("Internships / Experience", resume.experience),
    ):
        if items:
            sections.append(
                rf"\section*{{{latex_escape(title)}}}"
                + "\n"
                + "\n\\vspace{2pt}\n".join(_format_item(item) for item in items)
            )

    sections.append(_section("Certifications", [latex_escape(item) for item in resume.certifications]))
    sections.append(_section("Achievements", [latex_escape(item) for item in resume.achievements]))
    rendered_sections = "\n\n".join(section for section in sections if section)

    return "\n".join(
        [
            r"\documentclass[10pt]{article}",
            r"\usepackage[utf8]{inputenc}",
            r"\usepackage[T1]{fontenc}",
            r"\usepackage{lmodern}",
            r"\usepackage[margin=0.68in]{geometry}",
            r"\usepackage{enumitem}",
            r"\usepackage{xcolor}",
            r"\usepackage[hidelinks]{hyperref}",
            r"\usepackage{titlesec}",
            r"\definecolor{resumeBlue}{HTML}{173B64}",
            r"\titleformat{\section}{\large\bfseries\color{resumeBlue}}{}{0em}{}[\titlerule]",
            r"\setlist[itemize]{topsep=3pt}",
            r"\pagestyle{empty}",
            r"\begin{document}",
            r"\begin{center}",
            rf"{{\LARGE\bfseries {name}}}\\[4pt]",
            r" \textbar{} ".join(contact_lines),
            r"\end{center}",
            r"\vspace{-8pt}",
            rendered_sections,
            r"\end{document}",
            "",
        ]
    )
