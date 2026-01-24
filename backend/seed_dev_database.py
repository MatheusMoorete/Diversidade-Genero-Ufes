"""
Script para popular o banco de dados de desenvolvimento com dados de teste.
Cria 50 pacientes com respostas de formulário variadas.

USO: python seed_dev_database.py

IMPORTANTE: Executar apenas no ambiente de DESENVOLVIMENTO!
"""

import os
import sys
import random
from datetime import datetime, timedelta
from pathlib import Path

# Adiciona o diretorio pai ao path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.orm import Session
from app.database import engine, SessionLocal
from app.models import User, Patient, FormResponse
from app.auth import get_password_hash

# Dados para geracao aleatoria
FIRST_NAMES = [
    "Ana", "Maria", "Julia", "Carla", "Fernanda", "Beatriz", "Camila", "Larissa",
    "Lucas", "Pedro", "Gabriel", "Rafael", "Matheus", "Bruno", "Felipe", "Diego",
    "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Jamie", "Riley", "Quinn"
]

LAST_NAMES = [
    "Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Rodrigues",
    "Almeida", "Nascimento", "Ferreira", "Carvalho", "Gomes", "Martins", "Araujo",
    "Ribeiro", "Barbosa", "Moreira", "Cardoso", "Mendes", "Nunes", "Vieira"
]

SOCIAL_NAMES = [
    "Luna", "Aurora", "Helena", "Valentina", "Enzo", "Theo", "Noah", "Miguel",
    "Sky", "Phoenix", "River", "Storm", "Nova", "Sage", "Quinn", "Blake"
]

RACES = ["Branco", "Preto", "Pardo", "Indigena", "Amarelo"]

EDUCATION_LEVELS = [
    "Ensino fundamental incompleto",
    "Ensino fundamental completo",
    "Ensino medio incompleto",
    "Ensino medio completo",
    "Ensino superior incompleto",
    "Ensino superior completo"
]

MARITAL_STATUS = ["Solteiro", "Casado/Uniao estavel", "Separado", "Divorciado", "Viuvo"]

FAMILY_INCOME = [
    "Ate 2 salarios minimos",
    "2-4 salarios minimos",
    "4-10 salarios minimos",
    "10-20 salarios minimos"
]

HORMONE_TYPE_MEN = [
    "Sim, undecilato de testosterona (Hormus)",
    "Sim, cipionato de testosterona (Deposteron)",
    "Sim, propionato de testosterona (Durateston)",
    "Nunca fiz"
]

HORMONE_TYPE_WOMEN = [
    "Sim, estradiol + ciproterona",
    "Sim, somente estradiol",
    "Sim, somente ciproterona",
    "Nunca fiz"
]

MENTAL_HEALTH = [
    "Sim, psicologo",
    "Sim, psiquiatra",
    "Sim, psicologo e psiquiatra",
    "Nao"
]

MENTAL_DIAGNOSES = ["Depressao", "Ansiedade", "Sindrome do panico", "Insonia"]

DISEASES = ["Hipertensao arterial", "Diabetes", "Dislipidemias", "Varizes"]


def random_date(start_days_ago=365, end_days_ago=0):
    """Gera uma data aleatoria entre start_days_ago e end_days_ago"""
    days = random.randint(end_days_ago, start_days_ago)
    return datetime.now() - timedelta(days=days)


def random_future_date(start_days=7, end_days=90):
    """Gera uma data futura aleatoria"""
    days = random.randint(start_days, end_days)
    return datetime.now() + timedelta(days=days)


def generate_form_data(is_trans_men=True):
    """Gera dados de formulario aleatorios"""
    form_data = {
        # Dados sociodemograficos
        "social_name": random.choice(SOCIAL_NAMES) if random.random() > 0.3 else None,
        "race": random.choice(RACES),
        "birth_date": random_date(365*50, 365*18).strftime("%Y-%m-%d"),
        "tcle_signed": random.choice(["Sim", "Nao"]),
        "education_level": random.choice(EDUCATION_LEVELS),
        "marital_status": random.choice(MARITAL_STATUS),
        "family_income": random.choice(FAMILY_INCOME),
        "household_size": str(random.randint(1, 5)),
        
        # Terapia hormonal
        "using_hormone_therapy": random.choice(["Sim", "Nao"]),
    }
    
    # Adiciona detalhes de hormonio se estiver usando
    if form_data["using_hormone_therapy"] == "Sim":
        if is_trans_men:
            form_data["hormone_type_men"] = random.choice(HORMONE_TYPE_MEN)
        else:
            form_data["hormone_type_women"] = random.choice(HORMONE_TYPE_WOMEN)
    
    # Habitos de vida
    form_data["physical_activity"] = random.choice(["Sim", "Nao"])
    if form_data["physical_activity"] == "Sim":
        form_data["physical_activity_frequency"] = random.choice(["1-2 vezes", "3-4 vezes", "> 4 vezes"])
        form_data["physical_activity_type"] = random.choice(["Aerobica", "Musculacao"])
    
    form_data["alcohol_consumption"] = random.choice(["Sim", "Nao atualmente, mas ja consumi", "Nunca consumi"])
    form_data["smoking"] = random.choice(["Sim", "Nao atualmente, mas ja fumei", "Nunca fumei"])
    form_data["illicit_drugs"] = random.choice(["Sim", "Nao atualmente, mas ja usei", "Nunca usei"])
    
    # Saude
    form_data["blood_pressure"] = f"{random.randint(100, 140)}/{random.randint(60, 90)}"
    form_data["height"] = str(random.randint(155, 190))
    form_data["weight"] = str(random.randint(50, 100))
    
    # Doencas previas (aleatorio, pode ter 0 a 3)
    num_diseases = random.randint(0, 3)
    if num_diseases > 0:
        form_data["previous_diseases"] = random.sample(DISEASES, num_diseases)
    
    # Saude mental
    form_data["mental_health_follow_up"] = random.choice(MENTAL_HEALTH)
    if form_data["mental_health_follow_up"] != "Nao":
        num_diagnoses = random.randint(1, 2)
        form_data["mental_health_diagnosis"] = random.sample(MENTAL_DIAGNOSES, num_diagnoses)
    
    return form_data


def seed_database():
    """Popula o banco com dados de teste"""
    print("[*] Iniciando seed do banco de dados de desenvolvimento...")
    
    db = SessionLocal()
    
    try:
        # Verifica/cria usuario de teste
        test_user = db.query(User).filter(User.username == "dev_user").first()
        if not test_user:
            print("[+] Criando usuario de teste: dev_user / dev123")
            test_user = User(
                username="dev_user",
                password_hash=get_password_hash("dev123")
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
        else:
            print("[*] Usuario dev_user ja existe")
        
        # Conta pacientes existentes
        existing_count = db.query(Patient).filter(
            Patient.created_by_user_id == test_user.id,
            Patient.deleted_at.is_(None)
        ).count()
        
        print(f"[*] Pacientes existentes: {existing_count}")
        
        patients_to_create = max(0, 50 - existing_count)
        
        if patients_to_create == 0:
            print("[*] Ja existem 50+ pacientes. Pulando criacao.")
        else:
            print(f"[+] Criando {patients_to_create} pacientes...")
            
            for i in range(patients_to_create):
                # Gera nome aleatorio
                first_name = random.choice(FIRST_NAMES)
                last_name = random.choice(LAST_NAMES)
                full_name = f"{first_name} {last_name}"
                
                # Define se e homem ou mulher trans aleatoriamente
                is_trans_men = random.random() > 0.5
                
                # Cria paciente
                patient = Patient(
                    full_name=full_name,
                    created_by_user_id=test_user.id,
                    created_at=random_date(180, 1)
                )
                db.add(patient)
                db.commit()
                db.refresh(patient)
                
                # Cria 1-3 respostas de formulario por paciente
                num_responses = random.randint(1, 3)
                for j in range(num_responses):
                    form_data = generate_form_data(is_trans_men)
                    
                    response = FormResponse(
                        patient_id=patient.id,
                        response_date=random_date(180 - (j * 60), 1),
                        uses_hormone_over_1year=random.random() > 0.5,
                        form_data=form_data,
                        next_return_date=random_future_date(30, 90) if random.random() > 0.3 else None,
                        created_by_user_id=test_user.id,
                        created_at=random_date(180 - (j * 60), 1)
                    )
                    db.add(response)
                
                db.commit()
                
                if (i + 1) % 10 == 0:
                    print(f"  [{i + 1}/{patients_to_create}] pacientes criados...")
        
        # Estatisticas finais
        total_patients = db.query(Patient).filter(
            Patient.created_by_user_id == test_user.id,
            Patient.deleted_at.is_(None)
        ).count()
        
        total_responses = db.query(FormResponse).filter(
            FormResponse.created_by_user_id == test_user.id,
            FormResponse.deleted_at.is_(None)
        ).count()
        
        print("")
        print("[OK] Seed concluido com sucesso!")
        print("")
        print("Estatisticas:")
        print(f"  - Usuario: dev_user (senha: dev123)")
        print(f"  - Pacientes: {total_patients}")
        print(f"  - Respostas de formulario: {total_responses}")
        print("")
        print("[*] Agora voce pode fazer login com dev_user/dev123 e testar o sistema!")
        
    except Exception as e:
        print(f"[ERROR] Erro durante seed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
