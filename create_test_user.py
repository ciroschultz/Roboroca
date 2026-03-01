"""Script para criar usuário de teste flavio@gmail.com via API."""
import requests
import sys

BASE_URL = "http://localhost:8000"

def create_user():
    response = requests.post(
        f"{BASE_URL}/api/v1/auth/register",
        json={
            "email": "flavio@gmail.com",
            "username": "flavio",
            "password": "flavio123",
            "full_name": "Flavio",
        },
    )
    if response.status_code in (200, 201):
        print(f"Usuário criado com sucesso: {response.json()}")
    elif response.status_code == 400 and "already" in response.text.lower():
        print("Usuário já existe.")
    else:
        print(f"Erro {response.status_code}: {response.text}")
        sys.exit(1)

if __name__ == "__main__":
    create_user()
