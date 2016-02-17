"use strict";
require("mocha")
var aws = require("aws-sdk")
var keysOf = require("keys-of-obj")
var expect = require("must")
var s = require("util").format
var ec2Mock = require("./index")

var ec2 = new aws.EC2({
  "accessKeyId": process.env.KEY,
  "secretAccessKey": process.env.SECRET,
  "region": process.env.REGION
})

var INSTANCEID_RUNNING = "i-cb7b2946"
var INSTANCEID_STOPPED = "i-32ac1f8a"
var SECS = 1000
var MINUTES = 60 * SECS

describe("validating environment", function () {
  this.timeout(10 * SECS)
  it("should have a running instance", function (done) {
    ec2.describeInstances(
      {InstanceIds: [INSTANCEID_RUNNING]},
      function (err, data) {
        if (err) throw err
        expect(data.Reservations[0].Instances[0].State.Name).to.eql("running")
        done()
      })
  })

  it("should have a stopped instance", function (done) {
    ec2.describeInstances(
      {InstanceIds: [INSTANCEID_STOPPED]},
      function (err, data) {
        if (err) throw err
        expect(data.Reservations[0].Instances[0].State.Name).to.eql("stopped")
        done()
      })
  })
})

describe("ec2 live integration tests", function () {
  this.timeout(10 * MINUTES)
  var ids = []

  var register = function (id) { ids.push(id) }
  after(function (done) {
    if (ids.length)
      ec2.terminateInstances({InstanceIds: ids}, function (err) {
        if (err) throw err
        console.log("cleaned up", ids)
        ids = []
        done()
      })
    else done()
  })

  var spawnTestMachine = function (cb) {
    var args = {
      ImageId: "ami-3faf9f48", InstanceType: "t1.micro",
      MaxCount: 1, MinCount: 1
    }
    ec2.runInstances(args, function (err, data) {
      if (err) return cb(err)
      var instanceId = data.Instances[0].InstanceId
      register(instanceId)
      setTimeout(function () {
        cb(null, instanceId)
      })
    }, 1000)
  }

  describe("#createTags", function () {
    it("should match expected structure", function (done) {
      spawnTestMachine(function (err, id) {
        var args = {
          Resources: [id],
          Tags: [{Key: "Name", Value: "foo"}]
        }
        ec2.createTags(args, function (err, data) {
          if (err) throw err
          var mockedData = ec2Mock.createTags()
          expect(keysOf(data), notCompareMsg(mockedData, data))
            .to.eql(keysOf(mockedData))
          done()
        })
      })
    })
  })

  describe("#describeInstances", function () {
    it("should match type of naked call", function (done) {
      ec2.describeInstances(function (err, data) {
        if (err) throw err
        var mockedData = ec2Mock.describeInstances()
        expect(typeof data).to.eql(typeof mockedData)
        done()
      })
    })

    it("should match structure for a running machine", function (done) {
      var args = {InstanceIds: [INSTANCEID_RUNNING]}
      ec2.describeInstances(args, function (err, data) {
        if (err) throw err
        var mockedData = ec2Mock.describeInstances.singleInstance(
          "Reservations[0].Instances[0].Tags", [])
        expect(keysOf(data), notCompareMsg(mockedData, data))
          .to.eql(keysOf(mockedData))
        done()
      })
    })

    it("should match structure for a stopped machine", function (done) {
      var args = {InstanceIds: [INSTANCEID_STOPPED]}
      ec2.describeInstances(args, function (err, data) {
        if (err) throw err
        var mockedData = ec2Mock.describeInstances.stoppedInstance()
        expect(keysOf(data), notCompareMsg(mockedData, data))
          .to.eql(keysOf(mockedData))
        done()
      })
    })
  })

  describe("#getPasswordData", function () {
    it("should match expected structure", function (done) {
      var args = {InstanceId: INSTANCEID_RUNNING}
      ec2.getPasswordData(args, function (err, data) {
        if (err) throw err
        var mockedData = ec2Mock.getPasswordData.windowsInstance()
        expect(keysOf(data), notCompareMsg(mockedData, data))
          .to.eql(keysOf(mockedData))
        done()
      })
    })
  })

  describe("#runInstances", function () {
    it("should match structure on econ-style spawn", function (done) {
      var args = {
        ImageId: "ami-3faf9f48",
        InstanceType: "t1.micro",
        KeyName: "kon-tiki-development",
        MaxCount: 1, MinCount: 1,
        NetworkInterfaces: [{
          AssociatePublicIpAddress: true,
          SubnetId: "subnet-3a3b177c",
          DeviceIndex: 0,
          Groups: ["sg-9040a2f5"]
        }],
        UserData: new Buffer("<powershell>ls</powershell>").toString('base64')
      }
      ec2.runInstances(args, function (err, data) {
        if (err) throw err
        register(data.Instances[0].InstanceId)
        var mockedData = ec2Mock.runInstances.econSpawnerMachine()
        expect(keysOf(data), notCompareMsg(mockedData, data))
          .to.eql(keysOf(mockedData))
        done()
      })
    })
  })

  describe("#startInstances", function () {
    it("should match expected structure", function (done) {
      spawnTestMachine(function (err, id) {
        if (err) throw err
        waitUntilState(id, "running", function (err) {
          if (err) throw err
          var args = {InstanceIds: [id]}
          ec2.stopInstances(args, function (err) {
            if (err) throw err
            waitUntilState(id, "stopped", function (err) {
              if (err) throw err
              ec2.startInstances(args, function (err, data) {
                if (err) throw err
                var mockedData = ec2Mock.startInstances.stoppedInstance()
                expect(keysOf(data), notCompareMsg(mockedData, data))
                  .to.eql(keysOf(mockedData))
                done()
              })
            })
          })
        })
      })
    })
  })

  describe("#stopInstances", function () {
    it("should match expected structure", function (done) {
      spawnTestMachine(function (err, id) {
        if (err) throw err
        waitUntilState(id, "running", function (err) {
          if (err) throw err
          var args = {InstanceIds: [id]}
          ec2.stopInstances(args, function (err, data) {
            if (err) throw err
            var mockedData = ec2Mock.stopInstances.runningInstance()
            expect(keysOf(data), notCompareMsg(mockedData, data))
              .to.eql(keysOf(mockedData))
            done()
          })
        })
      })
    })
  })

  describe("#terminate", function () {
    it("should match expected structure", function (done) {
      spawnTestMachine(function (err, id) {
        var args = {InstanceIds: [id]}
        ec2.terminateInstances(args, function (err, data) {
          if (err) throw err
          var mockedData = ec2Mock.terminateInstances.spawnedMachine()
          expect(keysOf(data), notCompareMsg(mockedData, data))
            .to.eql(keysOf(mockedData))
          done()
        })
      })
    })
  })
})

var notCompareMsg = function (expected, actual) {
  return s("Objects do not match:\n" +
           "expected: %j\n" +
           "actual:   %j\n", expected, actual)
}

var machineState = function (id, cb) {
  ec2.describeInstances({InstanceIds: [id]}, function (err, data) {
    if (err) return cb(err)
    cb(null, data.Reservations[0].Instances[0].State.Name)
  })
}

var waitUntilState = function (id, desiredState, cb) {
  machineState(id, function (err, state) {
    if (err) return cb(err)
    if (state === desiredState) {
      cb(null)
    } else {
      console.log(s("machine not ready, state %s but wants %s. Retrying...",
                    state, desiredState))
      setTimeout(function () {
        waitUntilState(id, desiredState, cb)
      }, 3000)
    }
  })
}

