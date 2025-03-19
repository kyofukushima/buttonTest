import pytest
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_index_page(client):
    """インデックスページのテスト"""
    rv = client.get('/')
    assert rv.status_code == 200
    assert b'数当てゲーム' in rv.data

def test_check_number(client):
    """数字チェック機能のテスト"""
    rv = client.get('/check_number/50')
    assert rv.status_code == 200
    assert 'result' in rv.get_json() 