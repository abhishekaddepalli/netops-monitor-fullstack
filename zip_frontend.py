import os
import zipfile

def zip_dir(dir_path, zip_path):
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(dir_path):
            for file in files:
                file_path = os.path.join(root, file)
                # Ensure forward slashes for Linux compatibility
                arcname = os.path.relpath(file_path, dir_path).replace(os.sep, '/')
                zipf.write(file_path, arcname)

if __name__ == '__main__':
    zip_dir('frontend/dist', 'frontend/frontend_update_fixed.zip')
    print("Zip created successfully with forward slashes.")
