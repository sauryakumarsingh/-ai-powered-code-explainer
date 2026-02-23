<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    // Allow empty input for GET probes; don't error on missing body for some servers
    $input = [];
}

// compute route so this can live in a subdirectory (htdocs/myapp)
$requestPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$scriptName = $_SERVER['SCRIPT_NAME'];
$baseDir = rtrim(dirname($scriptName), '/');
if ($baseDir === '') $baseDir = '/';
$route = $requestPath;
if ($baseDir !== '/' && strpos($requestPath, $baseDir) === 0) {
    $route = substr($requestPath, strlen($baseDir));
    if ($route === '') $route = '/';
}

// normalize
$route = '/' . ltrim($route, '/');

if (strpos($route, '/api/explain') === 0) {
    handle_explain($input);
} else if (strpos($route, '/api/optimize') === 0) {
    handle_optimize($input);
} else {
    http_response_code(404);
    echo json_encode(['error' => 'not found', 'route' => $route]);
}

function get_env_api_key() {
    $key = getenv('OPENAI_API_KEY');
    if ($key) return $key;

    // try .env file in same folder
    $env = __DIR__ . '/.env';
    if (file_exists($env)) {
        $lines = file($env, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || strpos($line, '#') === 0) continue;
            if (strpos($line, 'OPENAI_API_KEY=') === 0) {
                return substr($line, strlen('OPENAI_API_KEY='));
            }
        }
    }
    return null;
}

function call_openai($prompt, $temperature = 0.2) {
    $apiKey = get_env_api_key();
    if (!$apiKey) {
        http_response_code(500);
        echo json_encode(['error' => 'OPENAI_API_KEY not set']);
        exit;
    }

    $data = [
        'model' => 'gpt-4o-mini',
        'messages' => [[ 'role' => 'user', 'content' => $prompt ]],
        'temperature' => $temperature
    ];

    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ]);
    $resp = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    if ($err) return ['error' => $err];
    return json_decode($resp, true);
}

function detect_language($code) {
    if (strpos($code, 'def ') !== false || strpos($code, 'import ') !== false || strpos($code, 'self') !== false) return 'Python';
    if (strpos($code, 'function ') !== false || strpos($code, '=>') !== false || strpos($code, 'console.log') !== false) return 'JavaScript';
    return 'Unknown';
}

function handle_explain($input) {
    $code = $input['code'] ?? '';
    $language = $input['language'] ?? detect_language($code);
    $annotations = $input['annotations'] ?? [];

    $prompt = "Explain the following $language code in 2-4 clear sentences. Do not hallucinate. If something is unclear, say so.\n\n";
    if (!empty($annotations)) {
        $prompt .= "Annotations:\n";
        foreach ($annotations as $a) {
            $prompt .= "- {$a['type']}: {$a['name']} (lines {$a['startLine']}-{$a['endLine']})\n";
        }
        $prompt .= "\n";
    }
    $prompt .= "Code:\n" . """\n" . $code . "\n" . """;

    $resp = call_openai($prompt, 0.2);
    if (isset($resp['error'])) { echo json_encode($resp); return; }
    $text = $resp['choices'][0]['message']['content'] ?? '';
    echo json_encode(['explanation' => trim($text), 'language' => $language, 'annotations' => $annotations]);
}

function handle_optimize($input) {
    $code = $input['code'] ?? '';
    $language = $input['language'] ?? detect_language($code);
    $annotations = $input['annotations'] ?? [];

    $prompt = "Rewrite this $language code to be more readable and idiomatic. Do not change behavior.\n\n";
    if (!empty($annotations)) {
        $prompt .= "Annotations:\n";
        foreach ($annotations as $a) {
            $prompt .= "- {$a['type']}: {$a['name']} (lines {$a['startLine']}-{$a['endLine']})\n";
        }
        $prompt .= "\n";
    }
    $prompt .= "Code:\n" . """\n" . $code . "\n" . """;

    $resp = call_openai($prompt, 0.3);
    if (isset($resp['error'])) { echo json_encode($resp); return; }
    $text = $resp['choices'][0]['message']['content'] ?? '';
    echo json_encode(['optimized' => trim($text), 'language' => $language, 'annotations' => $annotations]);
}
