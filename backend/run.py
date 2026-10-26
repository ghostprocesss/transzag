import sys
import os

# Add project root to sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

import uvicorn

if __name__ == "__main__":
    uvicorn.run("backend.app.api:app", host="127.0.0.1", port=8000, reload=False)
