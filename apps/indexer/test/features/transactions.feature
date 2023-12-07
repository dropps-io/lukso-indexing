Feature: Validate Indexing and Decoding Processes for Various Transactions

  Background:
      Given a database named "luksodata" exists
      And a database "luksostructure" exists™
      And a table "contract" exists in database "data"
      And a table "contract_token" exists in database "data"
      And a table "erc725y_data_changed" exists in database "data"
      And a table "event" exists in database "data"
      And a table "event_parameter" exists in database "data"
      And a table "metadata" exists in database "data"
      And a table "metadata_asset" exists in database "data"
      And a table "metadata_image" exists in database "data"
      And a table "metadata_link" exists in database "data"
      And a table "metadata_tag" exists in database "data"
      And a table "token_holder" exists in database "data"
      And a table "transaction" exists in database "data"
      And a table "transaction_input" exists in database "data"
      And a table "transaction_parameter" exists in database "data"
      And a table "wrapped_transaction" exists in database "data"
      And a table "wrapped_transaction_input" exists in database "data"
      And a table "wrapped_transaction_parameter" exists in database "data"
      And a table "config" exists in database "structure"
      And a table "contract_interface" exists in database "structure"
      And a table "erc725y_schema" exists in database "structure"
      And a table "method_interface" exists in database "structure"
      And a table "method_parameter" exists in database "structure"
      And a script called populate is executed
      And a block exists

  Scenario: A single "ERC20" transaction with no parameters is indexed correctly
      Given a "ERC20" transaction exits
      And the transaction its sended to the transactionsService
      And the transaction doesnt exists already in the database
      When we fetch the transaction data
      Then we insert a new contract
      And we insert the transactions details

  Scenario: A single "ERC20" transaction with parameters is indexed correctly
        Given a "ERC20" transaction exits
        And the transaction its sended to the transactionsService
        And the transaction doesnt exists already in the database
        When we fetch the transaction data
        And the transaction have parameters
        Then we insert a new contract
        And we insert the transactions details
        And we insert the transaction parameters

  Scenario: A wrapped "ERC20" transaction with parameters is indexed correctly
        Given a "ERC20" transaction exits
        And the transaction its sended to the transactionsService
        And the transaction doesnt exists already in the database
        When we fetch the transaction data
        And the transaction have parameters
        And the transactions is nested
        Then we insert a new contract
        And we insert the transactions details
        And we insert the transaction parameters
        And we call the indexWrappedTransactions service (to do)

