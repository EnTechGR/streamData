import os
import pandas as pd

# Define the input file and output directory
input_file = r"/mnt/c/Users/marin/Documents/streamData/argosaronic_gulf_march_2020_part_1/argosaronic_gulf_march_2020_part_1.csv"
output_dir = r"/mnt/c/Users/marin/Documents/streamData/myApp/streamData/data/argosaronic_gulf_march_2020_part_1"

# Create the output directory if it doesn't exist
os.makedirs(output_dir, exist_ok=True)

# Read the large CSV file in chunks
chunk_size = 500000  # Number of rows per chunk (you can adjust this for your desired file size)
df = pd.read_csv(input_file)

# Calculate the number of chunks needed
total_rows = len(df)
num_chunks = total_rows // chunk_size + (1 if total_rows % chunk_size != 0 else 0)

# Split the file into smaller chunks and save each as a new CSV file
for i in range(num_chunks):
    start_row = i * chunk_size
    end_row = min((i + 1) * chunk_size, total_rows)
    chunk_df = df.iloc[start_row:end_row]
    
    # Save each chunk as a separate CSV file
    chunk_file = os.path.join(output_dir, f"part_{i+1}.csv")
    chunk_df.to_csv(chunk_file, index=False)

    print(f"Created chunk: {chunk_file}")

print(f"File split into {num_chunks} parts.")
