
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.chat_models import ChatOpenAI
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain.prompts.prompt import PromptTemplate
from langchain.agents import AgentExecutor, Tool, initialize_agent
from crewai import Crew, Agent, Task
from langchain.chains import LLMChain, ConversationChain
from langchain.memory import ConversationBufferMemory
from state import state_store

from dotenv import load_dotenv
load_dotenv()
gemini = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.2)

# gpt3 = ChatOpenAI(
#     # model='gpt-4',
#     temperature=0.2,
#     streaming=True,
#     verbose=True)

# gpt4 = ChatOpenAI(model='gpt-4', temperature=0.2, streaming=True, verbose=True)

# gpt4 = ChatOpenAI(model='gpt-4', temperature=0,model_kwargs={"top_p": 0},
#                   # streaming=True, 
#                   verbose=True)
clinical_note_writer_template = PromptTemplate(
    input_variables=["transcript", "input"],
    template=
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
""")

cds_helper = PromptTemplate(
    input_variables=["transcript"],
    template=
    """Based on the provided transcript snippets from a doctor-patient consultation, please parse the information and generate a differential diagnosis, as well as potential questions the doctor could ask to facilitate the diagnosis process. The results should be organized in the following format:
Differential Diagnosis: List each possible diagnosis with a model confidence score from 0-100, 100 being most confident.
Questions to Ask: Provide a list of relevant questions the doctor could ask to further clarify the diagnosis.
Please consider the patient's stated symptoms, their medical history, and any other relevant information presented in the transcript. The consultation snippets are as follows:

{transcript}
""")

cds_helper_ddx_prompt = PromptTemplate(input_variables=["transcript"],
                                       template="""##DDX model
Based on the provided transcript snippets from a doctor-patient consultation, parse the information to generate a differential diagnosis. The results should be organized as follows:
Differential Diagnosis: List each possible diagnosis with a model confidence score from 0-100 (example: [30]), 100 being most confident.
Please consider the patient's stated symptoms, their medical history, and any other relevant information presented in the transcript. The consultation snippets are as follows:

{transcript}
Differential Diagnosis:
""")

# cds_helper_qa_prompt = PromptTemplate(
#     input_variables=["transcript"],
#     template=
#     """This is a technical job interview. Based on the conversation transcript between an interviewer and an interviewee provided below, generate an answer to the last interviewer's question only.
#     The answer generated must be in bullet points and not more than 50 words in total.
# Example conversation of a job interview session
# example of a job interview session between a candidate named Alex and an interviewer named Sarah for a software engineering position at a tech company:
# Interviewer (Sarah): Good morning, Alex. Thank you for coming in today. To start, could you tell me a bit about your background and experience?
# Candidate (Alex): Good morning, Sarah. Of course. I have a bachelor's degree in computer science from XYZ University, and I've been working as a software engineer for the past five years. My experience primarily includes front-end and back-end development, and I've worked with a variety of programming languages such as JavaScript, Python, and Java.
# Interviewer (Sarah): That sounds great, Alex. We're looking for someone with experience in web development, which aligns well with your background. Can you discuss a challenging project you've worked on recently and your role in it?
# Candidate (Alex): Certainly. In my previous role at ABC Company, I was part of a team that developed a new e-commerce platform. I was responsible for the front-end development, where I had to ensure smooth user experiences and responsive design across various devices. One of the challenges was optimizing the site's performance, and I implemented lazy loading and code splitting techniques to improve load times. This led to a 20% decrease in bounce rates and an increase in overall user satisfaction.
# Interviewer (Sarah): That's impressive, Alex. Performance optimization is crucial in today's web development landscape. Can you also tell me about a situation where you had to work with a difficult team member or faced a conflict at work? How did you handle it?
# Candidate (Alex): Certainly, Sarah. In my previous job, I had a situation where a team member and I had different approaches to solving a critical bug in our system. We had a heated discussion during a meeting, but I realized that it wasn't productive. So, I asked to have a one-on-one conversation with my colleague to understand their perspective better. We were able to find common ground and agreed on a solution that resolved the issue effectively. It taught me the importance of open communication and collaboration.
# Interviewer (Sarah): That's a great example of conflict resolution skills, Alex. Communication is key in any team. Moving forward, can you tell me about your experience with agile development methodologies like Scrum or Kanban?
# Candidate (Alex): Absolutely, Sarah. I've been working in agile environments for most of my career. In my previous role, we followed Scrum, and I was the Scrum Master for one of our teams. I facilitated daily stand-up meetings, sprint planning, and retrospectives. This helped us maintain a high level of transparency, adapt to changing requirements, and deliver software incrementally, which improved our overall productivity.
# Interviewer (Sarah): It sounds like you have a solid grasp of agile practices, Alex. Finally, what motivates you to join our company, and what do you hope to achieve here?
# Candidate (Alex): I've been following your company for a while now, and I'm impressed by the innovative projects you've been working on, especially in the field of AI and machine learning. I'm excited about the opportunity to contribute my skills and learn from the talented team here. I hope to continue growing as a software engineer and be part of projects that push the boundaries of technology.
# Interviewer (Sarah): Thank you for sharing that, Alex. It's been great getting to know you during this interview. We'll be in touch soon regarding the next steps in the hiring process.

# ### Conversation Transcript
# {transcript}
# """)
cds_helper_qa_prompt = PromptTemplate(input_variables=["transcript"],
                                      template="""##Doctor QA model
Based on the provided transcript snippets from a doctor-patient consultation, internally generate a differential diagnosis based on the patient's stated symptoms, their medical history, and any other relevant information presented in the transcript. Then, suggest potential questions the doctor could ask to facilitate the diagnosis process. The questions should be aimed at clarifying the diagnosis or gathering more information to refine the differential diagnosis.
The differential diagnosis should not be output. The results should be formatted as follows:
Questions to Ask: Provide a list of top 3 relevant questions the doctor could ask to further clarify the diagnosis. The question is succint and short.
The consultation snippets are as follows:

{transcript}
Questions to Ask:
""")

# cds_helper_qa_prompt = PromptTemplate(input_variables=["transcript"],
#                                       template="""This is a job interview conversation between a job interviewer and a candidate. The job interviewer asks questions and the candidate answers the questions. Answer the last questions asked by the interviewer only.
# The answer must be in bullet points and no more than 80 words.

# Example of a job interview conversation between a candidate named Alex and an interviewer named Sarah for a software engineering position at a tech company:

# Interviewer (Sarah): Good morning, Alex. Thank you for coming in today. To start, could you tell me a bit about your background and experience?
# Candidate (Alex): Good morning, Sarah. Of course. I have a bachelor's degree in computer science from XYZ University, and I've been working as a software engineer for the past five years. My experience primarily includes front-end and back-end development, and I've worked with a variety of programming languages such as JavaScript, Python, and Java.
# Interviewer (Sarah): That sounds great, Alex. We're looking for someone with experience in web development, which aligns well with your background. Can you discuss a challenging project you've worked on recently and your role in it?
# Candidate (Alex): Certainly. In my previous role at ABC Company, I was part of a team that developed a new e-commerce platform. I was responsible for the front-end development, where I had to ensure smooth user experiences and responsive design across various devices. One of the challenges was optimizing the site's performance, and I implemented lazy loading and code splitting techniques to improve load times. This led to a 20% decrease in bounce rates and an increase in overall user satisfaction.
# Interviewer (Sarah): That's impressive, Alex. Performance optimization is crucial in today's web development landscape. Can you also tell me about a situation where you had to work with a difficult team member or faced a conflict at work? How did you handle it?
# Candidate (Alex): Certainly, Sarah. In my previous job, I had a situation where a team member and I had different approaches to solving a critical bug in our system. We had a heated discussion during a meeting, but I realized that it wasn't productive. So, I asked to have a one-on-one conversation with my colleague to understand their perspective better. We were able to find common ground and agreed on a solution that resolved the issue effectively. It taught me the importance of open communication and collaboration.
# Interviewer (Sarah): That's a great example of conflict resolution skills, Alex. Communication is key in any team. Moving forward, can you tell me about your experience with agile development methodologies like Scrum or Kanban?
# Candidate (Alex): Absolutely, Sarah. I've been working in agile environments for most of my career. In my previous role, we followed Scrum, and I was the Scrum Master for one of our teams. I facilitated daily stand-up meetings, sprint planning, and retrospectives. This helped us maintain a high level of transparency, adapt to changing requirements, and deliver software incrementally, which improved our overall productivity.
# Interviewer (Sarah): It sounds like you have a solid grasp of agile practices, Alex. Finally, what motivates you to join our company, and what do you hope to achieve here?
# Candidate (Alex): I've been following your company for a while now, and I'm impressed by the innovative projects you've been working on, especially in the field of AI and machine learning. I'm excited about the opportunity to contribute my skills and learn from the talented team here. I hope to continue growing as a software engineer and be part of projects that push the boundaries of technology.
# Interviewer (Sarah): Thank you for sharing that, Alex. It's been great getting to know you during this interview. We'll be in touch soon regarding the next steps in the hiring process.

# The consultation snippets are as follows:
# {transcript}
# """)

patient_instructions_template = PromptTemplate(
    input_variables=["history", "input", "doctor_summary"],
    template=
    """As a medical chatbot named Paco, your task is to answer patient questions about their prescriptions. You should provide complete, scientifically-grounded, and actionable answers to queries, based on the provided recent clinical note.
Remember to introduce yourself as Paco only at the start of the conversation. You can communicate fluently in the patient's language of choice, such as English and Hindi. If the patient asks a question unrelated to the diagnosis or medications in the clinical note, your response should be, 'I cannot answer this question.'

### Recent Prescription
{doctor_summary}

Let's begin the conversation:
{history}
Patient: {input}
Paco:""")

cds_helper = LLMChain(llm=gemini, prompt=cds_helper, verbose=True)
# gpt4=gpt3
cds_helper_ddx = LLMChain(llm=gemini, prompt=cds_helper_ddx_prompt, verbose=True)
cds_helper_qa = LLMChain(llm=gemini, prompt=cds_helper_qa_prompt, verbose=True)

clinical_note_writer = LLMChain(llm=gemini,
                                prompt=clinical_note_writer_template,
                                verbose=True)
patient_instructor = LLMChain(llm=gemini,
                              prompt=patient_instructions_template,
                              verbose=True)





