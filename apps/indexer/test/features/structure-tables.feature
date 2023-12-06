Feature: Structure tables have valid data

  Scenario: The structure tables exist and are populated correctly
    Given a table "config" exists in database "structure"
    And a table "contract_interface" exists in database "structure"
    And a table "erc725y_schema" exists in database "structure"
    And a table "method_interface" exists in database "structure"
    And a table "method_parameter" exists in database "structure"
    When a script called populate is executed
    Then a table "config" have valid data
    And a table "contract_interface" have valid data
    And a table "erc725y_schema" have valid data
    And a table "method_interface" have valid data
    And a table "method_parameter" have valid data