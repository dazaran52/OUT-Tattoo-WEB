import os
from pathlib import Path

# Paths to search
directories = ['backend/app', 'backend/migrations', 'backend/main.py', 'frontend/src', 'frontend/public', 'package.json', 'package-lock.json']
base_dir = Path('/home/dazaran/Загрузки/OUT Tattoo WEB')

replacements = {
    'OUT Tattoo Leads': 'Tattoo Hub',
    'OUT Tattoo': 'Tattoo Hub',
    'out_tattoo_leads': 'TattooHub',
    'https://checkout.revolut.com/pay/05082067-c305-4853-a0ed-dd7cb4bccb39': 'https://checkout.revolut.com/pay/e79e0c52-e699-4abc-ab7d-ac68b1a62276',
    'https://checkout.revolut.com/pay/5ed4188d-af33-4d05-a5d6-5474f448f289': 'https://checkout.revolut.com/pay/e79e0c52-e699-4abc-ab7d-ac68b1a62276'
}

for d in directories:
    target = base_dir / d
    if target.is_file():
        files = [target]
    else:
        files = [f for f in target.rglob('*') if f.is_file() and f.suffix in ['.py', '.ts', '.tsx', '.json', '.html', '.sql', '.md']]

    for f in files:
        if 'node_modules' in f.parts or '.next' in f.parts:
            continue
        try:
            content = f.read_text(encoding='utf-8')
            new_content = content
            for old, new in replacements.items():
                new_content = new_content.replace(old, new)
            if new_content != content:
                f.write_text(new_content, encoding='utf-8')
                print(f"Updated {f}")
        except Exception as e:
            pass
