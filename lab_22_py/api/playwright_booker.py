"""Playwright booking skill.

This module is the only place that touches the local booking UI at:
`http://localhost:3333`.

It submits the booking form and returns the UI banner message, so the
LangGraph agent can surface success/error to the chat client.
"""

from __future__ import annotations

import asyncio
import os
import re
from pathlib import Path
from typing import Any

from playwright.async_api import async_playwright


_BOOKING_LOCK = asyncio.Lock()


def _get_booking_url() -> str:
    return os.environ.get("LAB22_BOOKING_URL", "http://localhost:3333").strip()


def _get_user_data_dir() -> Path:
    # Persistent user data dir so localStorage (lab_21_room_bookings_v1) persists.
    root = Path(__file__).resolve().parents[1]  # lab_22_py/
    return Path(os.environ.get("LAB22_PLAYWRIGHT_USER_DATA_DIR", str(root / ".playwright-user-data")))


async def _read_status_banner(page) -> tuple[str, str]:
    """
    Returns (status_type, ui_text)
    status_type is either 'success' or 'error' (based on className).
    """
    status = page.locator('div.status[role="status"]')

    # Wait for banner to show up with non-empty text.
    timeout_s = float(os.environ.get("LAB22_PLAYWRIGHT_STATUS_TIMEOUT_S", "15"))
    deadline = asyncio.get_event_loop().time() + timeout_s

    last_text = ""
    while asyncio.get_event_loop().time() < deadline:
        try:
            if await status.count() > 0 and await status.first.is_visible():
                last_text = (await status.first.inner_text()).strip()
                if last_text:
                    class_attr = await status.first.get_attribute("class") or ""
                    status_type = "success" if "status--success" in class_attr else "error"
                    return status_type, last_text
        except Exception:
            # Keep retrying until deadline.
            pass
        await asyncio.sleep(0.25)

    # Fallback (something went wrong; return whatever we captured).
    class_attr = await status.first.get_attribute("class") if await status.count() > 0 else ""
    status_type = "success" if "status--success" in (class_attr or "") else "error"
    return status_type, last_text or "No status message found."


def _extract_request_id(ui_text: str) -> str | None:
    m = re.search(r"Request id:\s*([A-Za-z0-9_\\-:.]+)", ui_text)
    if not m:
        return None
    return m.group(1)


async def book_room_via_playwright(
    *,
    room: int,
    start_datetime_local: str,
    user_name: str,
    description: str,
) -> dict[str, Any]:
    """
    Submit the booking form and return the UI banner message.
    """
    async with _BOOKING_LOCK:
        booking_url = _get_booking_url()
        user_data_dir = _get_user_data_dir()

        # Ensure parent directory exists.
        user_data_dir.parent.mkdir(parents=True, exist_ok=True)

        headless = os.environ.get("LAB22_PLAYWRIGHT_HEADLESS", "1") != "0"

        try:
            async with async_playwright() as p:
                context = await p.chromium.launch_persistent_context(
                    user_data_dir=str(user_data_dir),
                    headless=headless,
                    args=["--no-sandbox"],
                )
                try:
                    page = await context.new_page()
                    page.set_default_timeout(15000)

                    await page.goto(booking_url, wait_until="domcontentloaded")

                    # Fill the four fields. These selectors match lab_21_client_only/src/App.tsx.
                    await page.locator('input[type="datetime-local"]').fill(start_datetime_local)
                    await page.locator("textarea").fill(description)
                    await page.locator('input[type="text"]').fill(user_name)
                    await page.locator('input[type="number"]').fill(str(room))

                    await page.get_by_role("button", name="Book").click()

                    status_type, ui_text = await _read_status_banner(page)
                    request_id = _extract_request_id(ui_text)

                    return {
                        "ok": status_type == "success",
                        "status_type": status_type,
                        "ui_text": ui_text,
                        "request_id": request_id,
                        "raw": {
                            "booking_url": booking_url,
                            "room": room,
                            "start_datetime_local": start_datetime_local,
                        },
                    }
                finally:
                    await context.close()
        except Exception as e:
            return {
                "ok": False,
                "status_type": "error",
                "ui_text": f"Playwright booking failed: {e}",
                "request_id": None,
                "raw": {"exception": repr(e)},
            }

