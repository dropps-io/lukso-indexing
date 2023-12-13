Feature: ERC725ySchemas Scenarios

  Scenario: Successful Batch Insertion of ERC725ySchemas
    Given the API is running
    And i have a valid array of ERC725y schemas
    When i call the endPoint uploadERC725ySchemas
    Then the service should return HTTP 200
