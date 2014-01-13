<?php
        require_once('vendor/autoload.php');
        use Slim\Slim;

        // PDO Connection to MySQL
        $conn = new PDO('mysql:host=myDBHost.com;dbname=myDB', 'myDBUser', 'mySuperSecretPassword');

        function getInvestment() {
                global $app, $conn;

                $query = $conn->prepare('SELECT * FROM investments');
                $query->execute();
                echo(json_encode($query->fetchAll(PDO::FETCH_ASSOC)));
        }

        function saveInvestment() {
                global $app, $conn;

                $data = json_decode($app->request->getBody(), true);
                $query = $conn->prepare('INSERT INTO investments (amount, fund) VALUES(:amount, :fund)');

                $query->bindParam(':amount', $data['amount']);
                $query->bindParam(':fund', $data['fund']);

                $query->execute();
        }

        function updateInvestment($id) {
                global $app, $conn;
                $data = json_decode($app->request->getBody(), true);
                $query = $conn->prepare('UPDATE investments SET amount=:amount, fund=:fund WHERE id=:id');
                $query->bindParam(':amount', $data['amount']);
                $query->bindParam(':fund', $data['fund']);
                $query->bindParam(':id', $id);

                $query->execute();
                echo($app->request->getBody());
        }

        $app = new Slim();
        $app->get('/investments', 'getInvestment');
        $app->post('/investments', 'saveInvestment');
        $app->put('/investments/:id', 'updateInvestment');
        // $app->delete('/investments/:id', 'deleteInvestment');
        $app->run();
?>