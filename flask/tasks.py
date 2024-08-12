from crewai import Task, Crew,Process
from agents import clinical_note_writer, ddx_helper,qa_helper, HPI_helper
from typing import List

# Define tasks for the agents
clinical_note_task = Task(
    description=
    """Based on the conversation transcript and doctor's hints provided below, generate a clinical note in the following format:
    Diagnosis:
    History of Presenting Illness:
    Medications (Prescribed): List current medications and note if they are being continued, or if any new ones have been added.
    Lab Tests (Ordered):
    Please consider any information in the transcript that might be relevant to each of these sections, and use the doctor's hint as a guide.

    ### Example
    Conversation Transcript:
    Patient: “I've been taking the Glycomet-GP 1 as you prescribed, doctor, but I'm still feeling quite unwell. My blood pressure readings are all over the place and my sugar levels are high.”
    Doctor: “I see, we may need to adjust your medications. Let's add Jalra-OD and Telmis to your regimen and see how you respond.”
    Doctor's Hint: The patient has uncontrolled diabetes and hypertension despite adherence to the Glycomet-GP 1.
    Clinical Note:
    Diagnosis: Uncontrolled Diabetes and Hypertension
    History of Presenting Illness: The patient has been adhering to their current medication regimen but the diabetes and hypertension seem uncontrolled.
    Medications (Prescribed):
    [Continue] Glycomet-GP 1 (tablet) | Glimepiride and Metformin
    [Added] Jalra-OD 100mg (tablet) | Vildagliptin
    [Added] Telmis 20 (Tablet)
    Lab Tests (Ordered): None
    Now, based on the following conversation and hints, please generate a clinical note:

    ### Conversation Transcript
    {transcript}

    ### Doctor's Hint
    {input}
    """
    ,
    expected_output='A formatted clinical note.',
    tools=[],  # No external tools, we'll use internal logic
    agent=clinical_note_writer
)

ddx_task = Task(
    description=
    """##DDX model
    Based on the provided transcript snippets from a doctor-patient consultation, parse the information to generate a differential diagnosis. The results should be organized as follows:
    Differential Diagnosis: List each possible diagnosis with a model confidence score from 0-100 (example: [30]), 100 being most confident.
    Please consider the patient's stated symptoms, their medical history, and any other relevant information presented in the transcript. The consultation snippets are as follows:

    {transcript}
    Differential Diagnosis:
    """
    ,
    expected_output='potential diagnoses with confidence scores. Don\'t add any description after them',
    tools=[],
    agent=ddx_helper,
    async_execution=True
)

qa_task = Task(
    description=
    """##Doctor QA model
    Based on the provided transcript snippets from a doctor-patient consultation, internally generate a differential diagnosis based on the patient's stated symptoms, their medical history, and any other relevant information presented in the transcript. Then, suggest potential questions the doctor could ask to facilitate the diagnosis process. The questions should be aimed at clarifying the diagnosis or gathering more information to refine the differential diagnosis.
    The differential diagnosis should not be output. The results should be formatted as follows:
    Questions to Ask: Provide a list of top 3 relevant questions the doctor could ask to further clarify the diagnosis. The question is succint and short.
    The consultation snippets are as follows:

    {transcript}
    Questions to Ask:
    """
    ,
    expected_output='3 questions to ask the patient.',
    tools=[],
    agent=qa_helper,
    async_execution=True
)

hpi_task = Task(
    description=
    """##symptoms NER model
    Based on the provided transcript snippets from a doctor-patient consultation, internally extract medical related keywords on the patient's stated symptoms, their medical history, and any other medical keyword relevant information presented in the transcript. 
    Please return output with | to seperate each medical keywords you recongnized. The results should be formatted as follows (examples):
    fever | cough | feeling cold | herpes

    {transcript}
    
    """
    ,
    expected_output='extracted symptoms',
    tools=[],
    agent=HPI_helper,
    async_execution=True
)


def run_tasks(tasks: List, inputs):
    crew = Crew(
        agents=[task.agent for task in tasks],
        tasks=[task for task in tasks]
    )
    result = crew.kickoff(inputs=inputs)
    return result
