import psycopg2
from datetime import datetime, timedelta
import smtplib
from email.message import EmailMessage

# Database connection details
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "postgres",
    "user": "postgres",
    "password": "postgres"
}

def send_birthday_email(to_email, to_name):
    EMAIL_ADDRESS = 'asthetic0813@gmail.com'
    EMAIL_PASSWORD = 'xfhf kvfu zwjy najd'  # App password

    msg = EmailMessage()
    msg['Subject'] = '🎉 Happy Birthday!'
    msg['From'] = EMAIL_ADDRESS
    msg['To'] = to_email
    msg.set_content(f"Hi {to_name},\n\nWishing you a very Happy Birthday! 🎂🎈")

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            smtp.send_message(msg)
            print(f"✅ Email sent to {to_name} at {to_email}")
    except Exception as e:
        print(f"❌ Failed to send email: {e}")

def send_birthday_email_to_HR(to_email, to_name, names_list, today):
    EMAIL_ADDRESS = 'asthetic0813@gmail.com'
    EMAIL_PASSWORD = 'xfhf kvfu zwjy najd'  # App password

    day_label = "today" if today else "tomorrow"

    msg = EmailMessage()
    msg['Subject'] = f'🎂 Birthday Reminder for {day_label.capitalize()}'
    msg['From'] = EMAIL_ADDRESS
    msg['To'] = to_email
    msg.set_content(
        f"Hello {to_name},\n\n"
        f"The following employees have birthdays {day_label}:\n\n"
        f"{names_list}\n\n"
        f"Please prepare wishes 🎉."
    )

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            smtp.send_message(msg)
            print(f"✅ Birthday summary sent to HR ({to_email})")
    except Exception as e:
        print(f"❌ Failed to send HR summary: {e}")

def send_today_birthdays():
    """Send birthday emails to users who have birthdays today."""
    today = datetime.now()
    day = today.day
    month = today.month
    print(f"today : {today}")
    print(f"day : {day}")
    print(f"month : {month}")
    print(f"🔍 Checking birthdays for today: {today.strftime('%Y-%m-%d')}")
    birthday_names = []

    try:
        with psycopg2.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT name, email FROM birthdays
                    WHERE EXTRACT(MONTH FROM date) = %s
                      AND EXTRACT(DAY FROM date) = %s;
                """, (month, day))
                results = cur.fetchall()

                if results:
                    for name, email in results:
                        send_birthday_email(email, name)
                else:
                    print("No birthdays today.")
                if results:
                    for (name,_) in results:
                        birthday_names.append(name)

                    names_str = ", ".join(birthday_names)
                    if names_str:
                        # Send to both HRs
                        send_birthday_email_to_HR("karthikreddie08@gmail.com", "Sayona", names_str, True)
                        send_birthday_email_to_HR("karthikreddy0813@gmail.com", "Shobha", names_str, True)
            
    except Exception as e:
        print("Error while checking today's birthdays:", e)

def get_birthdays_tomorrow():
    """Send HR reminder email for birthdays tomorrow."""
    tomorrow = datetime.now() + timedelta(days=1)
    day = tomorrow.day
    month = tomorrow.month
    print(f"day : {day}")
    print(f"month : {month}")
    print(f"🔍 Checking birthdays for tomorrow: {tomorrow.strftime('%Y-%m-%d')}")

    birthday_names = []

    try:
        with psycopg2.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT name FROM birthdays
                    WHERE EXTRACT(MONTH FROM date) = %s
                      AND EXTRACT(DAY FROM date) = %s;
                """, (month, day))
                results = cur.fetchall()

                if results:
                    for (name,) in results:
                        birthday_names.append(name)

                    names_str = ", ".join(birthday_names)
                    if names_str:
                        # Send to both HRs
                        send_birthday_email_to_HR("karthikreddie08@gmail.com", "Sayona", names_str, False)
                        send_birthday_email_to_HR("karthikreddy0813@gmail.com", "Shobha", names_str, False)
                else:
                    print("No birthdays tomorrow.")

    except Exception as e:
        print("Error while checking tomorrow's birthdays:", e)

if __name__ == "__main__":
    send_today_birthdays()
    get_birthdays_tomorrow()
