Feature: ABI Scenarios

  Scenario: Correct upload of new ABIs.
    Given the API is running
    And i have a valid array of ABIs
    When i call the endPoint uploadAbi
    Then the service should return HTTP 200


  Scenario: Incorrect upload of new ABIs.
    Given the API is running
    When i have a un-valid array of ABIs
    Then the service should return HTTP 400

