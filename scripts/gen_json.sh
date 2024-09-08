#!/usr/bin/env bash

# Check if the correct number of arguments is provided
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <input_csv_file> <output_json_file>"
  exit 1
fi

input_file="$1"
output_file="$2"

# Check if the input file exists
if [ ! -f "$input_file" ]; then
  echo "Error: Input file '$input_file' not found!"
  exit 1
fi

# Start the JSON object
echo "{" > "$output_file"

# Process each line of the CSV, ignoring the header if present
awk -F, '{
    # Extract the year and month
    full_date=$1
    submissions=$2

    # Split the date into year and month
    split(full_date, date_parts, "-")
    year=date_parts[1]
    month=date_parts[2]

    # Only include entries starting from April 2007
    if (year >= 2007 && !(year == 2007 && month < "04")) {
        # Generate the arXiv key in the format "arXiv:YYMM"
        yy=substr(year, 3, 2)  # Extract last two digits of the year
        arxiv_key= yy month

        # If this is not the header, process the line
        if (NR > 1) {
            # Add an entry to the JSON file
            printf "\"%s\": %s,\n", arxiv_key, submissions >> "'"$output_file"'"
        }
    }
}' "$input_file"

# Remove the last comma and close the JSON object
sed -i '$ s/,$//' "$output_file"
echo "}" >> "$output_file"

echo "Data has been written to $output_file"