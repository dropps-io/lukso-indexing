Feature: Validate indexing and decoding of various events

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

    Scenario: Decode and index a single event correctly
      Given a "ERC20" log event exists
      And the event its not already indexed
      And we fetch the