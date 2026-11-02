<?php
/**
 * Scobad Centralized Data API (Zero-Config Server Storage)
 * Synchronizes Master Teams, Tournament Bracket, Active Live Match, and Match History
 * across all devices (Admin Laptop, Umpire Phone, Spectator / TV Screen).
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataDir = __DIR__ . '/data';
$dbFile  = $dataDir . '/database.json';

// Ensure data directory exists and is protected
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

$htaccessFile = $dataDir . '/.htaccess';
if (!file_exists($htaccessFile)) {
    @file_put_contents($htaccessFile, "Options -Indexes\n<Files \"*.json\">\n  Order Allow,Deny\n  Deny from all\n</Files>\n");
}

// Default initial state if database.json does not exist yet
function getDefaultDatabase() {
    return [
        'updatedAt' => round(microtime(true) * 1000),
        'masterTeams' => [
            [
                'id' => 'team-1',
                'name' => 'Tim 1 Alpha',
                'members' => [
                    ['id' => 'm-1', 'name' => 'Noval', 'gender' => 'male'],
                    ['id' => 'm-2', 'name' => 'Pak Turi', 'gender' => 'male'],
                    ['id' => 'm-3', 'name' => 'Muiz', 'gender' => 'male'],
                    ['id' => 'm-4', 'name' => 'Iwud', 'gender' => 'female']
                ]
            ],
            [
                'id' => 'team-2',
                'name' => 'Tim 2 Bravo',
                'members' => [
                    ['id' => 'm-5', 'name' => 'Alvian', 'gender' => 'male'],
                    ['id' => 'm-6', 'name' => 'Ilmi', 'gender' => 'female'],
                    ['id' => 'm-7', 'name' => 'Budi', 'gender' => 'male'],
                    ['id' => 'm-8', 'name' => 'Siti', 'gender' => 'female']
                ]
            ],
            [
                'id' => 'team-3',
                'name' => 'Tim 3 Charlie',
                'members' => [
                    ['id' => 'm-9', 'name' => 'Andi', 'gender' => 'male'],
                    ['id' => 'm-10', 'name' => 'Rina', 'gender' => 'female'],
                    ['id' => 'm-11', 'name' => 'Dimas', 'gender' => 'male'],
                    ['id' => 'm-12', 'name' => 'Ayu', 'gender' => 'female']
                ]
            ],
            [
                'id' => 'team-4',
                'name' => 'Tim 4 Delta',
                'members' => [
                    ['id' => 'm-13', 'name' => 'Kevin', 'gender' => 'male'],
                    ['id' => 'm-14', 'name' => 'Liliyana', 'gender' => 'female'],
                    ['id' => 'm-15', 'name' => 'Fajar', 'gender' => 'male'],
                    ['id' => 'm-16', 'name' => 'Apriyani', 'gender' => 'female']
                ]
            ]
        ],
        'bracket' => null,
        'activeMatch' => null,
        'matchHistory' => []
    ];
}

function readDatabase($dbFile) {
    if (!file_exists($dbFile)) {
        $default = getDefaultDatabase();
        writeDatabase($dbFile, $default);
        return $default;
    }

    $fp = @fopen($dbFile, 'r');
    if (!$fp) {
        return getDefaultDatabase();
    }

    flock($fp, LOCK_SH);
    $contents = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    $decoded = json_decode($contents, true);
    if (!is_array($decoded)) {
        return getDefaultDatabase();
    }
    return $decoded;
}

function writeDatabase($dbFile, $data) {
    $fp = @fopen($dbFile, 'c+');
    if (!$fp) {
        return false;
    }

    if (flock($fp, LOCK_EX)) {
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
        return true;
    }

    fclose($fp);
    return false;
}

// ==========================================
// HANDLE GET REQUEST (FETCH CENTRAL STATE)
// ==========================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $db = readDatabase($dbFile);
    $clientSince = isset($_GET['since']) ? (float)$_GET['since'] : 0;

    // If client already has the latest version, return lightweight not-modified response
    if ($clientSince > 0 && isset($db['updatedAt']) && $db['updatedAt'] <= $clientSince) {
        echo json_encode([
            'ok' => true,
            'changed' => false,
            'updatedAt' => $db['updatedAt']
        ]);
        exit;
    }

    echo json_encode([
        'ok' => true,
        'changed' => true,
        'updatedAt' => $db['updatedAt'] ?? round(microtime(true) * 1000),
        'data' => $db
    ]);
    exit;
}

// ==========================================
// HANDLE POST REQUEST (UPDATE CENTRAL STATE)
// ==========================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawBody = file_get_contents('php://input');
    $payload = json_decode($rawBody, true);

    if (!is_array($payload)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Invalid JSON payload']);
        exit;
    }

    $db = readDatabase($dbFile);

    // Partial or full update based on keys sent
    if (array_key_exists('masterTeams', $payload) && is_array($payload['masterTeams'])) {
        $db['masterTeams'] = $payload['masterTeams'];
    }

    if (array_key_exists('bracket', $payload)) {
        $db['bracket'] = $payload['bracket'];
    }

    if (array_key_exists('activeMatch', $payload)) {
        $db['activeMatch'] = $payload['activeMatch'];
    }

    if (array_key_exists('matchHistory', $payload) && is_array($payload['matchHistory'])) {
        $db['matchHistory'] = $payload['matchHistory'];
    }

    $db['updatedAt'] = round(microtime(true) * 1000);

    $saved = writeDatabase($dbFile, $db);

    echo json_encode([
        'ok' => $saved,
        'updatedAt' => $db['updatedAt']
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
