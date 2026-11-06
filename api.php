<?php
/**
 * GF ScoBad Centralized Data API (Zero-Config Server Storage)
 * Synchronizes Master Teams (Group A & B), Group Stage + Knockout Bracket, Active Live Match, and Match History
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

if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

$htaccessFile = $dataDir . '/.htaccess';
if (!file_exists($htaccessFile)) {
    @file_put_contents($htaccessFile, "Options -Indexes\n<Files \"*.json\">\n  Order Allow,Deny\n  Deny from all\n</Files>\n");
}

function getDefaultMasterTeams() {
    return [
        // GRUP A
        [
            'id' => 'team-a1',
            'code' => 'A1',
            'group' => 'A',
            'name' => 'Tim A1 Alpha',
            'subtitle' => 'p turi cs',
            'members' => [
                ['id' => 'm-a1-1', 'name' => 'Pak Turi', 'gender' => 'male'],
                ['id' => 'm-a1-2', 'name' => 'Noval', 'gender' => 'male'],
                ['id' => 'm-a1-3', 'name' => 'Muiz', 'gender' => 'male'],
                ['id' => 'm-a1-4', 'name' => 'Iwud', 'gender' => 'female']
            ]
        ],
        [
            'id' => 'team-a2',
            'code' => 'A2',
            'group' => 'A',
            'name' => 'Tim A2 Bravo',
            'subtitle' => 'nabila cs',
            'members' => [
                ['id' => 'm-a2-1', 'name' => 'Ilham', 'gender' => 'male'],
                ['id' => 'm-a2-2', 'name' => 'Afriza', 'gender' => 'male'],
                ['id' => 'm-a2-3', 'name' => 'Dhika', 'gender' => 'male'],
                ['id' => 'm-a2-4', 'name' => 'Nabila', 'gender' => 'female']
            ]
        ],
        [
            'id' => 'team-a3',
            'code' => 'A3',
            'group' => 'A',
            'name' => 'Tim A3 Charlie',
            'subtitle' => 'tamara cs',
            'members' => [
                ['id' => 'm-a3-1', 'name' => 'Dilla', 'gender' => 'male'],
                ['id' => 'm-a3-2', 'name' => 'Sello', 'gender' => 'male'],
                ['id' => 'm-a3-3', 'name' => 'Tamara', 'gender' => 'female'],
                ['id' => 'm-a3-4', 'name' => 'Mariyani', 'gender' => 'female']
            ]
        ],
        [
            'id' => 'team-a4',
            'code' => 'A4',
            'group' => 'A',
            'name' => 'Tim A4 Delta',
            'subtitle' => 'fahmi cs',
            'members' => [
                ['id' => 'm-a4-1', 'name' => 'Fahmi', 'gender' => 'male'],
                ['id' => 'm-a4-2', 'name' => 'Putra', 'gender' => 'male'],
                ['id' => 'm-a4-3', 'name' => 'Fakhri', 'gender' => 'male'],
                ['id' => 'm-a4-4', 'name' => 'Sela', 'gender' => 'female'],
                ['id' => 'm-a4-5', 'name' => 'Bu Indah', 'gender' => 'female']
            ]
        ],
        // GRUP B
        [
            'id' => 'team-b1',
            'code' => 'B1',
            'group' => 'B',
            'name' => 'Tim B1 Echo',
            'subtitle' => 'tesar cs',
            'members' => [
                ['id' => 'm-b1-1', 'name' => 'Tesar', 'gender' => 'male'],
                ['id' => 'm-b1-2', 'name' => 'Elang', 'gender' => 'male'],
                ['id' => 'm-b1-3', 'name' => 'Fathan', 'gender' => 'male'],
                ['id' => 'm-b1-4', 'name' => 'Nia', 'gender' => 'female'],
                ['id' => 'm-b1-5', 'name' => 'Bu Lila', 'gender' => 'female']
            ]
        ],
        [
            'id' => 'team-b2',
            'code' => 'B2',
            'group' => 'B',
            'name' => 'Tim B2 Foxtrot',
            'subtitle' => 'darvis cs',
            'members' => [
                ['id' => 'm-b2-1', 'name' => 'Darvis', 'gender' => 'male'],
                ['id' => 'm-b2-2', 'name' => 'Andrew', 'gender' => 'male'],
                ['id' => 'm-b2-3', 'name' => 'Sofia', 'gender' => 'female'],
                ['id' => 'm-b2-4', 'name' => 'Fitriyatil', 'gender' => 'female']
            ]
        ],
        [
            'id' => 'team-b3',
            'code' => 'B3',
            'group' => 'B',
            'name' => 'Tim B3 Gold',
            'subtitle' => 'radja cs',
            'members' => [
                ['id' => 'm-b3-1', 'name' => 'Radja', 'gender' => 'male'],
                ['id' => 'm-b3-2', 'name' => 'Reza', 'gender' => 'male'],
                ['id' => 'm-b3-3', 'name' => 'Bu Putri', 'gender' => 'female'],
                ['id' => 'm-b3-4', 'name' => 'Naily', 'gender' => 'female']
            ]
        ],
        [
            'id' => 'team-b4',
            'code' => 'B4',
            'group' => 'B',
            'name' => 'Tim B4 Hotel',
            'subtitle' => 'rahmad cs',
            'members' => [
                ['id' => 'm-b4-1', 'name' => 'Rahmad', 'gender' => 'male'],
                ['id' => 'm-b4-2', 'name' => 'Alvian', 'gender' => 'male'],
                ['id' => 'm-b4-3', 'name' => 'Fiter', 'gender' => 'female'],
                ['id' => 'm-b4-4', 'name' => 'Ilmi', 'gender' => 'female']
            ]
        ]
    ];
}

function getDefaultDatabase() {
    return [
        'schemaVersion' => 3,
        'updatedAt' => round(microtime(true) * 1000),
        'masterTeams' => getDefaultMasterTeams(),
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

    // Auto-migrate older schema (< 3) to the new 8-Team Group Stage (Grup A & Grup B) system
    if (!isset($decoded['schemaVersion']) || (int)$decoded['schemaVersion'] < 3) {
        $migrated = getDefaultDatabase();
        writeDatabase($dbFile, $migrated);
        return $migrated;
    }

    return $decoded;
}

function writeDatabase($dbFile, $data) {
    $data['schemaVersion'] = 3;
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
