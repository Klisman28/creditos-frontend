#!/usr/bin/env python3
"""Upload frontend dist to Hostinger via SFTP"""
import paramiko
import os
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

HOST = "109.106.251.229"
PORT = 65002
USER = "u530329005"
PASS = "Admin1234*"
LOCAL_DIR = os.path.join(os.path.dirname(__file__), "dist")
REMOTE_DIR = "/home/u530329005/domains/xn--crditosroksa-ceb.com/public_html"

def upload_dir(sftp, local_dir, remote_dir):
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = remote_dir + "/" + item

        if os.path.isdir(local_path):
            try:
                sftp.mkdir(remote_path)
            except:
                pass
            upload_dir(sftp, local_path, remote_path)
        else:
            sftp.put(local_path, remote_path)
            print(f"  [+] {remote_path}")

print("Connecting to Hostinger...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USER, password=PASS)
print("[+] Connected!")

sftp = ssh.open_sftp()
print(f"[*] Uploading dist/ to {REMOTE_DIR}...")
upload_dir(sftp, LOCAL_DIR, REMOTE_DIR)

sftp.close()
ssh.close()
print("\n[+] Upload complete!")
print(f"[*] Frontend available at: https://creditosroksa.com")
