import requests

EMAILJS_SERVICE_ID = 'service_5w6s02a'
EMAILJS_TEMPLATE_ID = 'template_tif2ata'
EMAILJS_USER_ID = 'xbWhVYdf2vuaarfT_'  # EmailJS public API key

# def send_birthday_email(to_email, to_name):
#     url = "https://api.emailjs.com/api/v1.0/email/send"
    
#     payload = {
#         "service_id": EMAILJS_SERVICE_ID,
#         "template_id": EMAILJS_TEMPLATE_ID,
#         "user_id": EMAILJS_USER_ID,
#         "template_params": {
#             "to_name": to_name,
#             "to_email": to_email
#         }
#     }

#     headers = {
#         "Content-Type": "application/json"
#     }

#     response = requests.post(url, json=payload, headers=headers)

#     if response.status_code == 200:
#         print(f"✅ Birthday email sent to {to_name} at {to_email}")
#     else:
#         print(f"❌ Failed to send email to {to_email}: {response.text}")
