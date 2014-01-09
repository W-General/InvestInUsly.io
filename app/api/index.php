<?php
	
	require_once('vendor/autoload.php');
	use Slim\Slim;

	$app = new Slim();
	$app->post('/gift', 'saveGift');
	$app->run();

	/*
		POST http://localhost:8888/DesignationApp/app/api/gift
	*/
	function saveGift() {
		echo 'test request';	
	}

?>