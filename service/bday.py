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
    EMAIL_PASSWORD = 'xfhf kvfu zwjy najd'  # App password, not your Gmail login

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

def send_birthday_email_to_HR(to_email, to_name, names_list):
    EMAIL_ADDRESS = 'asthetic0813@gmail.com'
    EMAIL_PASSWORD = 'xfhf kvfu zwjy najd'  # App password

    msg = EmailMessage()
    msg['Subject'] = '🎂 Birthday Reminder for Tomorrow'
    msg['From'] = EMAIL_ADDRESS
    msg['To'] = to_email
    msg.set_content(f"Hello {to_name},\n\nThe following employees have birthdays tomorrow:\n\n{names_list}\n\nPlease prepare wishes 🎉.")

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            smtp.send_message(msg)
            print(f"✅ Birthday summary sent to HR ({to_email})")
    except Exception as e:
        print(f"❌ Failed to send HR summary: {e}")

def get_birthdays_tomorrow():
    # Get tomorrow's date
    tomorrow = datetime.now() + timedelta(days=1)
    day = tomorrow.day
    month = tomorrow.month
    print(f"Debug: Tomorrow is {tomorrow}, day = {day}, month = {month}")

    birthday_names = []  # List to collect names with birthdays tomorrow

    try:
        # Connect to the PostgreSQL database
        with psycopg2.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cur:
                query = """
                    SELECT id, name, date, email, status
                    FROM birthdays
                    WHERE EXTRACT(MONTH FROM date) = %s
                      AND EXTRACT(DAY FROM date) = %s;
                """
                cur.execute(query, (day, month))
                results = cur.fetchall()

                if results:
                    print(f"🎉 Birthdays on {tomorrow.strftime('%Y-%m-%d')}:")
                    for row in results:
                        name = row[1]
                        email = row[3]
                        send_birthday_email(email, name)
                        birthday_names.append(name)
                        print(f"ID: {row[0]}, Name: {name}, Date: {row[2]}, Email: {email}, Status: {row[4]}")

                    # ✅ Send combined birthday list to HR
                    hr_email = "karthikreddie08@gmail.com"  # 🔁 Change to actual HR email
                    hr_name = "Karthik Reddie"  # 🔁 Change to actual HR name
                    names_str = ", ".join(birthday_names)
                    if names_str:
                        send_birthday_email_to_HR(hr_email, hr_name, names_str)

                else:
                    print(f"No birthdays found for {tomorrow.strftime('%Y-%m-%d')}.")

    except Exception as e:
        print("Error connecting to database:", e)

if __name__ == "__main__":
    get_birthdays_tomorrow()
