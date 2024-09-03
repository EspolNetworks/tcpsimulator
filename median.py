import sys

file = sys.argv[1]

times = []
percentages = []

with open(file, 'r') as f:
    for line in f:
        split_line = line.split(" ")
        time = split_line[2]
        time = float(time)
        times.append(time)
        
        percentage = split_line[8]
        percentage = float(percentage)
        percentages.append(percentage)
        
print(f"Average time: {sum(times)/len(times)}")
print(f"Average percentage: {sum(percentages)/len(percentages)}")