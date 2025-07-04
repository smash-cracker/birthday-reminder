import os
import psycopg2
from datetime import datetime, timedelta
import smtplib
from email.message import EmailMessage
from email.utils import make_msgid
from mimetypes import guess_type

# ────────── 1. DB credentials ──────────
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "postgres",
    "user": "postgres",
    "password": "postgres"
}

# ────────── 2. Gmail credentials ───────
EMAIL_ADDRESS = "asthetic0813@gmail.com"
EMAIL_PASSWORD = "xfhf kvfu zwjy najd"         # App‑specific password

# ────────── 3. Low‑level mail helpers ───
def _attach_card(msg: EmailMessage, card_path: str = "/home/karthik/birthday-stack/service/birthday_card.jpg"):
    """Attach + embed an image if file exists."""
    if not os.path.isfile(card_path):
        return  # silent: nothing to attach

    maintype, subtype = (guess_type(card_path)[0] or "application/octet-stream").split("/", 1)
    with open(card_path, "rb") as f:
        data = f.read()

    cid = make_msgid(domain="birthday.local")  # random <…@birthday.local>
    msg.add_related(data, maintype=maintype, subtype=subtype, cid=cid[1:-1])  # strip <>

    # Let the HTML refer to the inline image
    if msg.get_content_type() == "text/html":
        html = msg.get_content()
        html += f'<br><img src="cid:{cid[1:-1]}" alt="Happy Birthday card">'
        msg.set_content(html, subtype="html")

def _send(msg: EmailMessage):
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            smtp.send_message(msg)
        print(f"✅ Email sent to {msg['To']}")
    except Exception as e:
        print(f"❌ Failed to send to {msg['To']}: {e}")

# ────────── 4. User‑facing mail helpers ─
def send_birthday_email(to_email, to_name):
    """Direct wish to the birthday employee."""
    msg = EmailMessage()
    msg["Subject"] = "🎉 Happy Birthday!"
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = to_email
    msg.set_content(f"Hi {to_name},\n\nWishing you a very Happy Birthday! 🎂🎈")
    _attach_card(msg)
    _send(msg)

def send_birthday_email_to_HR(to_email, to_name, names_list, today):
    """Daily summary to HR."""
    day_label = "today" if today else "tomorrow"
    msg = EmailMessage()
    msg["Subject"] = f"🎂 Birthday Reminder for {day_label.capitalize()}"
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = to_email
    msg.set_content(
        f"Hello {to_name},\n\n"
        f"The following employees have birthdays {day_label}:\n\n"
        f"{names_list}\n\n"
        "Please prepare wishes 🎉."
    )
    _send(msg)

def send_birthday_announcement(recipients, birthday_name):
    """Announcement to everyone else in the company."""
    if not recipients:
        return
    msg = EmailMessage()
    msg["Subject"] = f"🎂 It's {birthday_name}'s Birthday Today!"
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = ", ".join(recipients)   # a single message with visible To:
    msg.set_content(
        f"Hello Team,\n\n"
        f"Let's celebrate {birthday_name}'s special day today! "
        f"Drop your wishes and make the day amazing! 🎉🎂"
    )
    _attach_card(msg)
    _send(msg)

# ────────── 5. Main routines ────────────
def send_today_birthdays():
    today = datetime.now()
    day, month = today.day, today.month
    print(f"🔍 Checking birthdays for today: {today:%Y-%m-%d}")

    try:
        with psycopg2.connect(**DB_CONFIG) as conn, conn.cursor() as cur:
            # 1) Who is celebrating today?
            cur.execute("""
                SELECT name, email FROM birthdays
                WHERE EXTRACT(MONTH FROM date) = %s
                  AND EXTRACT(DAY FROM date)   = %s;
            """, (month, day))
            birthday_people = cur.fetchall()

            # 2) All employees (used for announcements)
            cur.execute("SELECT email FROM birthdays;")
            all_emails = [row[0] for row in cur.fetchall()]

        if not birthday_people:
            print("No birthdays today.")
            return

        # Wish each birthday person
        for name, email in birthday_people:
            send_birthday_email(email, name)

        # HR summary
        names_str = ", ".join(name for name, _ in birthday_people)
        send_birthday_email_to_HR("karthikreddie08@gmail.com", "Sayona", names_str, True)
        send_birthday_email_to_HR("karthikreddy0813@gmail.com", "Shobha", names_str, True)

        # Team announcements (one per birthday person keeps subject clear)
        for name, email in birthday_people:
            other_emails = [e for e in all_emails if e != email]
            send_birthday_announcement(other_emails, name)

    except Exception as e:
        print("Error while checking today's birthdays:", e)

def get_birthdays_tomorrow():
    """Only HR summary for tomorrow (no team‑wide mail)."""
    tomorrow = datetime.now() + timedelta(days=1)
    day, month = tomorrow.day, tomorrow.month
    print(f"🔍 Checking birthdays for tomorrow: {tomorrow:%Y-%m-%d}")

    try:
        with psycopg2.connect(**DB_CONFIG) as conn, conn.cursor() as cur:
            cur.execute("""
                SELECT name FROM birthdays
                WHERE EXTRACT(MONTH FROM date) = %s
                  AND EXTRACT(DAY FROM date)   = %s;
            """, (month, day))
            rows = cur.fetchall()

        if not rows:
            print("No birthdays tomorrow.")
            return

        names_str = ", ".join(name for (name,) in rows)
        send_birthday_email_to_HR("karthikreddie08@gmail.com", "Sayona", names_str, False)
        send_birthday_email_to_HR("karthikreddy0813@gmail.com", "Shobha", names_str, False)

    except Exception as e:
        print("Error while checking tomorrow's birthdays:", e)

# ────────── 6. Entrypoint ───────────────
if __name__ == "__main__":
    send_today_birthdays()
    get_birthdays_tomorrow()
