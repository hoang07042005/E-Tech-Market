<?php
require 'config/database.php';
$db = (new Database())->getConnection();
$stmt = $db->query('SELECT title, content FROM product_news LIMIT 1');
print_r($stmt->fetch(PDO::FETCH_ASSOC));
