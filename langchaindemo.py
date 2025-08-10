# pip install streamlit langchain openai chromadb unstructured python-docx

import streamlit as st
import os
from langchain.document_loaders import UnstructuredFileLoader
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.chains import RetrievalQA
from langchain.chat_models import ChatOpenAI

# ===== Streamlit UI =====
st.set_page_config(page_title="Custom QnA Chatbot", page_icon="🤖", layout="wide")
st.title("📚 Custom Knowledge Base QnA Chatbot")

# Sidebar for API key
api_key = st.sidebar.text_input("Enter your OpenAI API Key", type="password")
if api_key:
    os.environ["OPENAI_API_KEY"] = api_key

uploaded_file = st.sidebar.file_uploader("Upload your .docx Knowledge Base", type=["docx"])

if uploaded_file and api_key:
    # Step 1: Load document
    with open("uploaded_doc.docx", "wb") as f:
        f.write(uploaded_file.read())

    loader = UnstructuredFileLoader("uploaded_doc.docx")
    documents = loader.load()
    st.sidebar.success(f"Loaded {len(documents)} document(s)")

    # Step 2: Create embeddings
    embeddings = OpenAIEmbeddings()

    # Step 3: Store in Chroma
    persist_directory = "./chroma_db"
    vectorstore = Chroma.from_documents(documents, embeddings, persist_directory=persist_directory)
    vectorstore.persist()

    # Step 4: Create retriever
    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

    # Step 5: Initialize LLM
    llm = ChatOpenAI(model_name="gpt-4", temperature=0)

    # Step 6: Build RetrievalQA Chain
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=retriever,
        chain_type="stuff"
    )

    # Chat interface
    st.subheader("💬 Ask your Knowledge Base")
    user_question = st.text_input("Type your question here:")

    if user_question:
        with st.spinner("Searching..."):
            response = qa_chain.run(user_question)
        st.markdown(f"**Answer:** {response}")

else:
    st.info("Please upload a .docx file and enter your OpenAI API key to start.")
