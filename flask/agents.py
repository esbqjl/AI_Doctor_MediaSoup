from crewai import Agent
import os
from langchain_google_genai import ChatGoogleGenerativeAI
# Define the agent

gemini = ChatGoogleGenerativeAI(model="gemini-1.5-flash", verbose=True, temperature=0.2, google_api_key=os.getenv("GOOGLE_API_KEY"))


clinical_note_writer = Agent(
    role='Clinical Note Writer',
    goal='Generate clinical notes based on doctor-patient conversations and hints',
    verbose=False,
    memory=True,
    backstory=(
        "As a clinical note writer, your role is to meticulously document patient "
        "encounters, ensuring all relevant information is accurately captured to support "
        "patient care."
    ),
    tools=[],  # No external tools, we'll use internal logic
    llm=gemini,
    allow_delegation=False
)

ddx_helper = Agent(
    role='DDX Helper',
    goal='Generate differential diagnosis based on doctor-patient conversations',
    verbose=False,
    memory=True,
    llm=gemini,
    backstory=(
        "As a DDX helper, your role is to assist in the diagnostic process by providing "
        "a list of potential diagnoses based on the information provided in patient consultations."
    ),
    tools=[],
    allow_delegation=False
    
)

qa_helper = Agent(
    role='QA Helper',
    goal='Suggest potential questions a doctor could ask to facilitate diagnosis',
    verbose=False,
    memory=True,
    llm=gemini,
    backstory=(
        "As a QA helper, your role is to enhance the diagnostic process by suggesting "
        "insightful questions that doctors can ask to gather more relevant information from patients."
    ),
    tools=[],
    allow_delegation=False
)

HPI_helper = Agent(
    role='HPI helper',
    goal='Extract medical related symptoms from the patient',
    verbose=False,
    memory=True,
    llm=gemini,
    backstory=(
        "As a symptoms NER helper, your role is to extract symptoms keyword from the input of the patient "
        "symptoms that doctors will care about which to gather more relevant information from patients."
    ),
    tools=[],
    allow_delegation=False
)







