import sys
import os

# Add the project root to the python path so imports work correctly
# Vercel copies the entire directory, and the app resides in 'app'
# Since this file is in 'api/', we need to insert the parent directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
