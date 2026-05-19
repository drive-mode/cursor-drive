---
name: Small-Scope Resume Focus
overview: Focus the tailoring flow on ML/AI orchestration roles by wiring custom instructions into resume generation and adding a minimal autonomous-agent run configuration to apply and verify the change.
todos: []
isProject: false
---

# Small-Scope Resume Tailoring Run

## Key context

```36:79:c:/Users/harri/Documents/Coding Projects/fun/roller/src/roller/tailoring/generator.py
# Prompt templates for AI generation
SUMMARY_PROMPT = """Generate a professional summary for a resume targeting this job:

Job Title: {job_title}
Company: {company_name}
Job Description: {job_description}

Candidate Profile:
- Name: {name}
- Years of Experience: {years_exp}
- Current/Recent Title: {recent_title}
- Top Matching Skills: {matching_skills}
- Original Summary: {original_summary}

Requirements:
1. Write in first person
2. 2-3 sentences maximum
3. Highlight skills that match the job requirements
4. Be specific about achievements and expertise
5. Mention the target role naturally

Generate ONLY the summary text, no explanations."""

COVER_LETTER_PROMPT = """Generate a cover letter for this job application:
```

```77:103:c:/Users/harri/Documents/Coding Projects/fun/roller/src/roller/tailoring/models.py
class TailoringRequest(BaseModel):
    """Request to tailor a resume for a job.

    Attributes:
        job_id: Target job posting ID (if from database)
        job_posting: Target job posting (if provided directly)
        user_profile_id: User profile ID
        strategy: Tailoring strategy to use
        section_priorities: Priority for each section
        max_experiences: Maximum experiences to include
        max_skills: Maximum skills to include
        max_projects: Maximum projects to include
        include_cover_letter: Generate cover letter
        custom_instructions: Additional instructions for AI
    """
    job_id: UUID | None = None
    job_posting: "JobPosting | None" = None
    user_profile_id: UUID | None = None
    strategy: TailoringStrategy = TailoringStrategy.BALANCED
    section_priorities: dict[str, SectionPriority] = Field(default_factory=dict)
    max_experiences: int = 4
    max_skills: int = 12
    max_projects: int = 3
    include_cover_letter: bool = True
    custom_instructions: str = ""
```

```243:258:c:/Users/harri/Documents/Coding Projects/fun/roller/src/roller/cli/main.py
@app.command()
def tailor_job(
    job_url: Annotated[
        str,
        typer.Argument(help="URL of job posting to tailor for"),
    ],
    output_dir: Annotated[
        Optional[Path],
        typer.Option("--output", "-o", help="Output directory for generated files"),
    ] = None,
) -> None:
    """Generate tailored resume and cover letter for a specific job.

    Creates customized application materials without submitting.
    """
    asyncio.run(_tailor_job(job_url=job_url, output_dir=output_dir))
```

## Plan

- Wire role-focused instructions into tailoring prompts by updating `SUMMARY_PROMPT` and `COVER_LETTER_PROMPT` in `[src/roller/tailoring/generator.py](c:/Users/harri/Documents/Coding Projects/fun/roller/src/roller/tailoring/generator.py)` and injecting `TailoringRequest.custom_instructions` when formatting prompts. Keep the instructions centered on ML/AI orchestration roles and make the field optional with a safe fallback.
- Add a CLI option to pass those instructions into the tailoring flow by extending `tailor_job` in `[src/roller/cli/main.py](c:/Users/harri/Documents/Coding Projects/fun/roller/src/roller/cli/main.py)` to accept an `--instructions` (or `--focus`) flag and populate `TailoringRequest.custom_instructions`.
- Create a minimal autonomous-agent run config for this scope (new `configs/autonomous-agent-ml-scope.json`) with a `custom` task that updates the prompts and CLI wiring, and a `custom` task that adds a short usage example to `[docs/autonomous-agent.md](c:/Users/harri/Documents/Coding Projects/fun/roller/docs/autonomous-agent.md)` showing how to pass ML/AI orchestration instructions.
- Run the scoped agent queue using `roller agent run --plan --config configs/autonomous-agent-ml-scope.json`, then `roller agent run --config configs/autonomous-agent-ml-scope.json`, and verify `.ralph/queue.json` plus a single `roller tailor-job --instructions "ML/AI orchestration" <job_url>` output for sanity.
