Feature: ABI Scenarios

  Scenario: The API receives a valid array of ABI.
    Given the API is running
    And i have a valid array of ABIs
    When i call the endPoint uploadAbi
    Then the service should return HTTP 200


#  Scenario: The API receives an empty array of ABI.
#    Given the API is running
#    When I send an empty array of ABI to the endpoint
#    Then the service should return HTTP 400
#
#  Scenario: The API receives invalid ABI.
#    Given the API is running
#    When I send invalid ABI to the endpoint
#    Then it should return an error response
#    And the service should return HTTP 404
#
#  Scenario: The API receives a large array of ABI.
#    Given the API is running
#    When I send a large array of ABI to the endpoint
#    Then it should process the request within a reasonable time
#    And the service should return HTTP 201
