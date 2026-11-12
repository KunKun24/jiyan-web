<?php
/**
 * Example configuration — copy the real values into your PRIVATE backend.
 *
 * This file contains placeholders only. Never commit real credentials,
 * SMTP passwords, signing keys or server addresses.
 */
return [
    'db' => [
        'host'     => 'db.example.com',
        'port'     => 3306,
        'name'     => 'jiyan_example',
        'user'     => 'jiyan_user',
        'password' => 'YOUR_DB_PASSWORD',
        'charset'  => 'utf8mb4',
    ],
    'smtp' => [
        'host'     => 'smtp.example.com',
        'port'     => 465,
        'user'     => 'no-reply@example.com',
        'password' => 'YOUR_SMTP_PASSWORD',
        'from'     => 'no-reply@example.com',
    ],
    'signing' => [
        'api_key'       => 'YOUR_API_KEY',
        'sign_key'      => 'YOUR_SIGN_KEY',
        'encryption_key'=> 'YOUR_ENCRYPTION_KEY',
    ],
];
