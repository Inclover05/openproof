"""Direct-mode fixtures: no live chain or LLM claims are made by these tests."""
import json
import hashlib
import os
from pathlib import Path
from unittest.mock import patch
import pytest
from gltest.direct import VMContext, deploy_contract

SOURCE = b'Fixture promise: owner() equals the zero address at cutoff. Published 2024-01-01.'
URL = 'https://raw.githubusercontent.com/openproof/fixtures/commit/promise.txt'
ZERO = '0x' + '0' * 40

@pytest.fixture
def fixture():
    vm = VMContext()
    vm._sender = bytes.fromhex('11' * 20)
    delayed = []
    unlink = os.unlink
    def windows_unlink(path, *args, **kwargs):
        try:
            return unlink(path, *args, **kwargs)
        except PermissionError as exc:
            if os.name != 'nt' or exc.winerror != 32:
                raise
            delayed.append(path)
    # gltest 0.29.2 unlinks its open stdin file, which Windows does not permit.
    # Defer only that deletion; preserve the SDK and all consensus behavior.
    with vm.activate():
        with patch('os.unlink', windows_unlink):
            contract = deploy_contract(Path('contracts/openproof_v2.py'), vm, sdk_version='v0.2.14')
        state = {'word': '0x' + '0' * 64, 'source': SOURCE, 'status': 200, 'chain': 1, 'next_time': 1001, 'fail': False}
        def web(data):
            if data['url'] in state.get('sources', {}):
                body, status = state['sources'][data['url']]
            elif data['url'] == URL:
                body, status = state['source'], state['status']
            else:
                if state['fail']:
                    raise TimeoutError('fixture timeout')
                request = json.loads(data['body'])
                method, params = request['method'], request['params']
                if method == 'eth_chainId':
                    result = hex(state['chain'])
                elif method == 'eth_getBlockByNumber':
                    n = 100 if params[0] == 'finalized' else int(params[0], 16)
                    result = {'number': hex(n), 'timestamp': hex(state['next_time'] if n == 101 else 1000), 'hash': '0x' + 'a' * 64}
                elif method == 'eth_getCode':
                    result = '0x6001'
                elif method in ('eth_call', 'eth_getStorageAt'):
                    result = state['word']
                else:
                    raise AssertionError(method)
                body, status = json.dumps({'result': result}).encode(), 200
            return {'ok': {'response': {'status': status, 'headers': {}, 'body': body}}}
        vm._live_web_handler = web
        vm.mock_llm('Assess this untrusted', '{"eligible": true}')
        yield contract, vm, state
    for path in delayed:
        try:
            unlink(path)
        except PermissionError:
            pass

def payload(kind='control', **extra):
    value = {'case_id': 'fixture-case', 'claim_type': kind, 'chain_id': 1, 'address': '0x'+'1'*40, 'claim': 'A precisely dated public promise for an isolated fixture.', 'block': 100, 'cutoff': 1000, 'source_hash': hashlib.sha256(SOURCE).hexdigest(), 'source': URL, 'expected': ZERO, 'field': 'owner()'}
    if kind == 'treasury':
        value.update(field='unlockTime()', expected='1788220800')
    elif kind == 'upgrade':
        value.update(field='EIP-1967')
    value.update(extra)
    value['verification']='promise'
    value['sources']=[{'id':'source-1','url':value.pop('source'),'hash':value.pop('source_hash')}]
    return json.dumps(value)

@pytest.mark.parametrize('kind', ['control', 'treasury', 'upgrade'])
def test_supported_and_repeatability(fixture, kind):
    c, vm, state = fixture
    if kind == 'treasury':
        state['word'] = '0x'+format(1788220800, '064x')
    c.evaluate(payload(kind))
    result = json.loads(c.get_case('fixture-case'))
    assert result['outcome'] == 'Supported'
    assert result['decisive_evidence_refs'] == ['source-1', 'chain-1']
    # Direct runner 0.29.2 cannot decode this SDK's sandbox result (type 14).
    # Exercise repeatability here; live validator votes are tested on Bradbury.
    c.evaluate(payload(kind, case_id='repeat'))
    repeated = json.loads(c.get_case('repeat'))
    assert repeated['outcome'] == result['outcome']
    assert repeated['observed_value'] == result['observed_value']
    state['word'] = '0x'+format(1, '064x')
    c.evaluate(payload(kind, case_id='changed'))
    assert json.loads(c.get_case('changed'))['outcome'] == 'Contradicted'

def test_contradicted(fixture):
    c, vm, state = fixture
    state['word'] = '0x'+format(1, '064x')
    c.evaluate(payload())
    assert json.loads(c.get_case('fixture-case'))['outcome'] == 'Contradicted'

@pytest.mark.parametrize('change,reason', [({'status':403},'SOURCE_UNAVAILABLE'),({'source':b'Changed fixture source with enough public text to be readable.'},'SOURCE_CHANGED'),({'fail':True},'HISTORICAL_STATE_UNAVAILABLE'),({'chain':8453},'HISTORICAL_STATE_UNAVAILABLE'),({'word':'0x123'},'HISTORICAL_STATE_UNAVAILABLE'),({'next_time':999},'HISTORICAL_STATE_UNAVAILABLE')])
def test_missing_changed_or_invalid_evidence(fixture,change,reason):
    c, vm, state = fixture
    state.update(change)
    c.evaluate(payload())
    result=json.loads(c.get_case('fixture-case'))
    assert result['outcome']=='Insufficient evidence'
    assert result['reason_code']==reason

def test_unrelated_source_and_duplicate(fixture):
    c,vm,state=fixture
    vm.clear_mocks()
    vm.mock_llm('Assess this untrusted','{"eligible": false}')
    c.evaluate(payload())
    assert json.loads(c.get_case('fixture-case'))['reason_code']=='SOURCE_NOT_SUFFICIENT'
    with pytest.raises(Exception):
        c.evaluate(payload())

def test_private_url_and_unsupported_field_rejected(fixture):
    c,vm,state=fixture
    with pytest.raises(Exception):
        c.evaluate(payload(source='http://127.0.0.1/admin'))
    with pytest.raises(Exception):
        c.evaluate(payload(field='admin()'))

@pytest.mark.parametrize('kind', ['control', 'treasury', 'upgrade'])
def test_state_mode_without_public_promise(fixture, kind):
    c, vm, state = fixture
    vm.clear_mocks()
    state['status'] = 403
    if kind == 'treasury':
        state['word'] = '0x' + format(1788220800, '064x')
    data = json.loads(payload(kind)); data.update(verification='state', sources=[])
    c.evaluate(json.dumps(data))
    result = json.loads(c.get_case('fixture-case'))
    assert result['outcome'] == 'Supported'
    assert result['decisive_evidence_refs'] == ['chain-1']

def test_corroboration_preserves_blocked_original(fixture):
    c, vm, state = fixture
    data = json.loads(payload())
    data['sources'] = [{'id':'source-1','url':'https://medium.com/@project/blocked','hash':''}, {'id':'source-2','url':URL,'hash':hashlib.sha256(SOURCE).hexdigest()}]
    c.evaluate(json.dumps(data))
    assert json.loads(c.get_case('fixture-case'))['decisive_evidence_refs'] == ['source-2','chain-1']

@pytest.mark.parametrize('provider', ['x', 'medium'])
def test_social_normalized_content_is_retrieved_independently(fixture, provider):
    c, vm, state = fixture
    if provider == 'x':
        url = 'https://x.com/GenLayer/status/2041643224536592387'
        endpoint = 'https://publish.x.com/oembed?url=https%3A%2F%2Ftwitter.com%2FGenLayer%2Fstatus%2F2041643224536592387&omit_script=true&dnt=true'
        body = json.dumps({'author_url':'https://twitter.com/GenLayer','url':'https://twitter.com/GenLayer/status/2041643224536592387','html':'<p>' + SOURCE.decode() + '</p>'}).encode()
        normalized = 'x-oembed-v1\nhttps://twitter.com/GenLayer\n' + SOURCE.decode()
    else:
        url = endpoint = 'https://medium.com/@project/promise'
        body = ('<script>{"datePublished":"2024-01-01"}</script><article>' + SOURCE.decode() + '</article>').encode()
        normalized = 'medium-article-v1\n2024-01-01\n' + SOURCE.decode()
    state['sources'] = {endpoint: (body,200)}
    data = json.loads(payload()); data['sources'] = [{'id':'source-1','url':url,'hash':hashlib.sha256(normalized.encode()).hexdigest()}]
    c.evaluate(json.dumps(data))
    assert json.loads(c.get_case('fixture-case'))['outcome'] == 'Supported'
    state['sources'][endpoint] = (body.replace(b'zero address',b'other owner'),200)
    data['case_id'] = 'changed-social'; c.evaluate(json.dumps(data))
    assert json.loads(c.get_case('changed-social'))['reason_code'] == 'SOURCE_CHANGED'
