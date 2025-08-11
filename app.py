from flask import Flask, render_template, request, jsonify, send_from_directory
import json
import os
from datetime import datetime
import uuid
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads/images'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Criar diretórios necessários
os.makedirs('static/uploads/images', exist_ok=True)
os.makedirs('projects', exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/save_project', methods=['POST'])
def save_project():
    try:
        data = request.json
        project_name = data.get('project_name', 'Projeto_Enxoval')

        # Sanitizar nome do arquivo
        safe_name = secure_filename(project_name)
        if not safe_name:
            safe_name = 'projeto_enxoval'

        # Adicionar timestamp para evitar conflitos
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{safe_name}_{timestamp}.json"
        filepath = os.path.join('projects', filename)

        # Adicionar metadados
        project_data = {
            'metadata': {
                'name': project_name,
                'created_at': datetime.now().isoformat(),
                'version': '1.0'
            },
            'data': data
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(project_data, f, ensure_ascii=False, indent=2)

        return jsonify({
            'success': True,
            'filename': filename,
            'message': f'Projeto salvo como {filename}'
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/load_project', methods=['POST'])
def load_project():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'Nenhum arquivo selecionado'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'Nenhum arquivo selecionado'}), 400

        if file and file.filename.endswith('.json'):
            content = file.read().decode('utf-8')
            project_data = json.loads(content)

            # Verificar se é um arquivo de projeto válido
            if 'data' in project_data:
                return jsonify({
                    'success': True,
                    'data': project_data['data'],
                    'metadata': project_data.get('metadata', {})
                })
            else:
                # Arquivo antigo sem metadados
                return jsonify({
                    'success': True,
                    'data': project_data,
                    'metadata': {}
                })

        return jsonify({'success': False, 'error': 'Arquivo inválido'}), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/upload_image', methods=['POST'])
def upload_image():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'Nenhum arquivo selecionado'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'Nenhum arquivo selecionado'}), 400

        if file and allowed_file(file.filename):
            # Gerar nome único para o arquivo
            filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

            # Retornar URL relativa
            image_url = f"/static/uploads/images/{filename}"
            return jsonify({'success': True, 'image_url': image_url})

        return jsonify({'success': False, 'error': 'Tipo de arquivo não permitido'}), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/list_projects')
def list_projects():
    try:
        projects = []
        project_dir = 'projects'

        if os.path.exists(project_dir):
            for filename in os.listdir(project_dir):
                if filename.endswith('.json'):
                    filepath = os.path.join(project_dir, filename)
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            metadata = data.get('metadata', {})
                            projects.append({
                                'filename': filename,
                                'name': metadata.get('name', filename.replace('.json', '')),
                                'created_at': metadata.get('created_at', ''),
                                'size': os.path.getsize(filepath)
                            })
                    except:
                        # Arquivo corrompido, ignorar
                        continue

        # Ordenar por data de criação (mais recente primeiro)
        projects.sort(key=lambda x: x['created_at'], reverse=True)

        return jsonify({'success': True, 'projects': projects})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/projects/<filename>')
def serve_project(filename):
    try:
        filepath = os.path.join('projects', filename)
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            return jsonify({'success': False, 'error': 'Arquivo não encontrado'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
