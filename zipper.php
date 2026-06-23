<?php
$source = __DIR__ . '/backend';
$destination = 'C:/Users/THALA/Desktop/cpanel_ready_v2.zip';

if (file_exists($destination)) {
    unlink($destination);
}

$zip = new ZipArchive();
if (!$zip->open($destination, ZipArchive::CREATE | ZipArchive::OVERWRITE)) {
    die("Failed to create zip file.");
}

$files = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($source, RecursiveDirectoryIterator::SKIP_DOTS),
    RecursiveIteratorIterator::LEAVES_ONLY
);

$excludePaths = ['node_modules', '.git'];
$excludeFiles = ['.env', 'database.sqlite', 'installed', 'database.sqlite-shm', 'database.sqlite-wal'];

foreach ($files as $name => $file) {
    if (!$file->isDir()) {
        $filePath = $file->getRealPath();
        $relativePath = substr($filePath, strlen($source) + 1);
        $relativePath = str_replace('\\', '/', $relativePath);

        // Check exclusions
        $skip = false;
        foreach ($excludePaths as $ex) {
            if (strpos($relativePath, $ex . '/') === 0 || strpos($relativePath, '/' . $ex . '/') !== false) {
                $skip = true;
                break;
            }
        }
        if (in_array(basename($filePath), $excludeFiles)) {
            $skip = true;
        }

        if (!$skip) {
            $zip->addFile($filePath, $relativePath);
        }
    }
}

$zip->close();
echo "Zip created successfully: " . $destination . "\n";
