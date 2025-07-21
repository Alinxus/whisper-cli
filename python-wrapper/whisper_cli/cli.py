import os
import subprocess
import sys

# Function to get the path of the Whisper CLI executable

def get_whisper_cli_path():
    # Assume the executable is downloaded in the package directory
    base_dir = os.path.dirname(os.path.abspath(__file__))
    cli_executable = 'whisper'

    if sys.platform.startswith('win'):
        cli_executable += '.exe'

    return os.path.join(base_dir, cli_executable)

def main():
    # Determine the path to the Whisper CLI
    cli_path = get_whisper_cli_path()

    # Check if the CLI executable exists
    if not os.path.exists(cli_path):
        print("Whisper CLI executable not found! Please ensure it is installed correctly.")
        sys.exit(1)

    # Pass all command-line arguments to the Whisper CLI
    subprocess.run([cli_path] + sys.argv[1:], check=True)

if __name__ == "__main__":
    main()
