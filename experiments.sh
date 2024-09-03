#!/bin/bash

# The command to run the target script
command="bun run client.ts --file example.txt"

# Number of repetitions
repetitions=10

# Output file
output_file="results2.txt"

# Empty the output file
> "$output_file"

for i in $(seq 1 $repetitions); do
  # Start time
  start_time=$(date +%s.%N)

  # Run the command and capture the output
  output=$($command 2>&1)

  # End time
  end_time=$(date +%s.%N)

  # Calculate elapsed time in seconds
  elapsed_time=$(echo "$end_time - $start_time" | bc)

  # Extract the specific part of the output (e.g., a line containing "Result")
  extracted_result=$(echo "$output" | grep "Percentage packets lost/damaged: ")

  # If the result is not found, set a default message
  if [ -z "$extracted_result" ]; then
    extracted_result="No result found"
  fi

  # Append the results to the output file
  echo "Execution Time: $elapsed_time seconds, Output: $extracted_result" >> "$output_file"
done

echo "Results written to $output_file"

