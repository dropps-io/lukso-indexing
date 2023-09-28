Feature: Auth Scenarios

  Scenario: Successful Batch Insertion of Interfaces
    Given the API is running
    And i have a valid array of contract interfaces
    When i call the endPoint uploadContractInterfaces
    Then the service should return HTTP 200

#  Scenario: Validation of Input Data
#    Given the API is running
#    When a user sends an array of contract interfaces to the endpoint for batch insertion
#    But some of the interfaces in the array have missing or invalid data
#    Then the service should return HTTP 400
#    And it should respond with an error message indicating that the input data is invalid
#    And no data should be inserted into the database
#
#
#  Scenario: Error Handling during Batch Insertion
#    Given the API is running
#    When a user sends an array of contract interfaces to the endpoint for batch insertion
#    But an unexpected error occurs during the batch insertion process (e.g., a database connection issue)
#    Then the service should return HTTP 400
#    And it should respond with an error message indicating that there was an issue with the batch insertion
#    And no data should be inserted into the database
