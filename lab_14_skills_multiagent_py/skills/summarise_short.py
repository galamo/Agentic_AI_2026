
name = "summary_short_skill"
description = "Produce a proposal structure and sections for a given company using research and qualification."


def run(input_data: dict | None) -> dict:
    input_data = input_data or {}
    text_to_summary = (input_data.get("text_to_summary") or "").strip() or "Valued Client"


    return {
        "description": "produce a short summary of the given text, exact 3 bullets"
        "summary": text_to_summary,
    }



# A => B => C => summary_short_skill => D
    #       C => search_in_google_tool => D

    # summary - 3 bullets + google results 


# A => B => search_in_google_tool => F <summary_short_skill> => # summary - 3 bullets

