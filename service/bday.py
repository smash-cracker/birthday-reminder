import os
import psycopg2
from datetime import datetime, timedelta
import smtplib
from email.message import EmailMessage
from email.utils import make_msgid
from mimetypes import guess_type

# ───── 1. Configuration ─────
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "postgres",
    "user": "postgres",
    "password": "postgres"
}

EMAIL_ADDRESS = "asthetic0813@gmail.com"
EMAIL_PASSWORD = "xfhf kvfu zwjy najd"
CARD_PATH = "/home/karthik/birthday-stack/service/birthday_card.jpg"

# ───── 2. Email Sending ─────
def _send(msg: EmailMessage):
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            smtp.send_message(msg)
        print(f"✅ Email sent to {msg['To']}")
    except Exception as e:
        print(f"❌ Failed to send to {msg['To']}: {e}")

def _embed_card(msg: EmailMessage, cid: str):
    if not os.path.isfile(CARD_PATH):
        return
    maintype, subtype = (guess_type(CARD_PATH)[0] or "application/octet-stream").split("/", 1)
    with open(CARD_PATH, "rb") as img:
        msg.get_payload()[1].add_related(img.read(), maintype=maintype, subtype=subtype, cid=cid)

# ───── 3. Message Builders ─────
def send_birthday_email(to_email, to_name):
    msg = EmailMessage()
    msg["Subject"] = "🎉 Happy Birthday!"
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = to_email

    # Plain-text fallback
    msg.set_content(f"Hi {to_name},\n\nWishing you a very Happy Birthday! 🎂🎈")

    # HTML version
    cid = make_msgid(domain="birthday.local")[1:-1]
    html = f"""
    <html>
      <body>
        <p>Hi {to_name},</p>
        <p>Wishing you a very Happy Birthday! 🎂🎈</p>
        <img src="cid:{cid}" alt="Birthday Card" style="max-width:500px; border-radius:10px;">
      </body>
    </html>
    """
    msg.add_alternative(html, subtype="html")
    _embed_card(msg, cid)
    _send(msg)

def send_birthday_email_to_HR(to_email, to_name, names_list, today):
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
    if not recipients:
        return
    msg = EmailMessage()
    msg["Subject"] = f"🎂 It's {birthday_name}'s Birthday Today!"
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = ", ".join(recipients)

    msg.set_content(
        f"Hello Team,\n\n"
        f"Let's celebrate {birthday_name}'s special day today! "
        f"Drop your wishes and make the day amazing! 🎉🎂"
    )

    cid = make_msgid(domain="birthday.local")[1:-1]
    html = f"""
    <html>
      <body>
        <p>Hello Team,</p>
        <p>Let's celebrate <b>{birthday_name}</b>'s special day today! 🎉🎂</p>
      </body>
    </html>
    """
    msg.add_alternative(html, subtype="html")
    _send(msg)

# ───── 4. Core Logic ─────
def send_today_birthdays():
    today = datetime.now()
    day, month = today.day, today.month
    print(f"🔍 Checking birthdays for today: {today:%Y-%m-%d}")

    try:
        with psycopg2.connect(**DB_CONFIG) as conn, conn.cursor() as cur:
            cur.execute("""
                SELECT name, email FROM birthdays
                WHERE EXTRACT(MONTH FROM date) = %s AND EXTRACT(DAY FROM date) = %s;
            """, (month, day))
            birthday_people = cur.fetchall()

            cur.execute("SELECT email FROM birthdays;")
            all_emails = [row[0] for row in cur.fetchall()]

        if not birthday_people:
            print("No birthdays today.")
            return

        # 1. Send wish to each person
        for name, email in birthday_people:
            send_birthday_email(email, name)

        # 2. Send HR summary
        names_str = ", ".join(name for name, _ in birthday_people)
        send_birthday_email_to_HR("karthikreddie08@gmail.com", "Sayona", names_str, True)
        send_birthday_email_to_HR("karthikreddy0813@gmail.com", "Shobha", names_str, True)

        # 3. Notify team (exclude birthday person)
        for name, email in birthday_people:
            others = [e for e in all_emails if e != email]
            send_birthday_announcement(others, name)

    except Exception as e:
        print("⚠️ Error while checking today's birthdays:", e)

def get_birthdays_tomorrow():
    tomorrow = datetime.now() + timedelta(days=1)
    day, month = tomorrow.day, tomorrow.month
    print(f"🔍 Checking birthdays for tomorrow: {tomorrow:%Y-%m-%d}")

    try:
        with psycopg2.connect(**DB_CONFIG) as conn, conn.cursor() as cur:
            cur.execute("""
                SELECT name FROM birthdays
                WHERE EXTRACT(MONTH FROM date) = %s AND EXTRACT(DAY FROM date) = %s;
            """, (month, day))
            results = cur.fetchall()

        if not results:
            print("No birthdays tomorrow.")
            return

        names_str = ", ".join(name for (name,) in results)
        send_birthday_email_to_HR("karthikreddie08@gmail.com", "Sayona", names_str, False)
        send_birthday_email_to_HR("karthikreddy0813@gmail.com", "Shobha", names_str, False)

    except Exception as e:
        print("⚠️ Error while checking tomorrow's birthdays:", e)

# ───── 5. Run ─────
if __name__ == "__main__":
    send_today_birthdays()
    get_birthdays_tomorrow()
