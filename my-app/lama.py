from langchain_groq import ChatGroq

# Initialize Llama model
llm = ChatGroq(
    model_name="llama-3.3-70b-versatile",
    temperature=0.9,
    groq_api_key="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"
)

# Function to read and extract a range of lines
def get_selected_lines(file_path, start_line, end_line):
    with open(file_path, "r") as file:
        lines = file.readlines()
    
    # Extract the range of lines (start to end, inclusive)
    selected_text = "\n".join(lines[i - 1].strip() for i in range(start_line, end_line + 1) if 0 < i <= len(lines))
    return selected_text, lines  # Returning both extracted text and full file lines

# Function to replace selected lines with corrected text
def replace_lines_in_file(file_path, start_line, end_line, corrected_text, lines):
    # Split corrected text into lines
    corrected_lines = corrected_text.split("\n")
    
    # Replace the old lines with corrected ones
    lines[start_line - 1:end_line] = [line + "\n" for line in corrected_lines]

    # Write back to the file
    with open(file_path, "w") as file:
        file.writelines(lines)

# File path
file_path = "C:\\Users\\trive\\OneDrive\\Desktop\\Hackathon\\test.txt"

# Define the range of lines to select (e.g., lines 2 to 4)
start_line, end_line = 2, 5
selected_lines, file_lines = get_selected_lines(file_path, start_line, end_line)

# Predefined prompt (placed AFTER the selected lines)
predefined_prompt = (
    "\n\nCorrect the grammar of the above text. "
    "Do not add anything extra. Do not explain your answer. "
    "Provide only the corrected text without any additional words."
)

# Combine the selected text and the predefined prompt
final_prompt = selected_lines + predefined_prompt

# Invoke Llama model
response = llm.invoke(final_prompt)

# Get only the corrected text
corrected_text = response.content.strip()

# Replace in the original file
replace_lines_in_file(file_path, start_line, end_line, corrected_text, file_lines)

print("File updated successfully with corrected text.")
