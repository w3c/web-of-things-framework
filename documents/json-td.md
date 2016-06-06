
# Representing Thing Data Models in JSON

This is a proposal for a JSON based representation of thing data models for a [proposal for the type system  for the Web of Things](./types.md).  It is a variant of JSON-LD and intended to provide compact descriptions that will be more appealing to web developers than other more verbose alternatives. The Web of Things is expected to be huge so why shouldn't we design a representation that best suites the needs and preference of Web developers?

Some people may ask why not use JSON schema? JSON Schema has the same role as XML Schema for XML, i.e. you can use it to verify that a JSON structure conforms to a given schema. Using JSON Schema to describe the data models for properties, actions and events would constrain them to the type system defined for JSON. Given that the Web of Things is intended to work with wide range of platforms, this assumption is likely to break.

If we were to adopt JSON Schema for applications where the assumption holds, then in principle it could be applied to the values for properties, actions and events. We could perhaps reference JSON schemas from JSON-LD, or we could define a synthesis of JSON-LD and JSON Schema. Both approaches would be considerably more complex that the approach outlined in this note.

The Web of Things  is based upon W3C's Resource Description Framework (RDF), which is very general, and provides the extensibility that we need to meet evolving requirements. In particular, it allows us to define the type system independently of the schema language. We need agreed ways to express the data and interaction model exposed to applications, along with other metadata. Moreover, these ways should be acceptable to the developers, and should be usable on resource constrained devices.

Note that JSON Schema is is not yet a formal standard. It is defined on the [json-schema.org website](http://json-schema.org) and a set of expired IETF Internet Drafts.

##Memory considerations for Thing Descriptions

When an application on one device wants to interact with a remote thing, it can request the platform to create a proxy object for that thing based upon its thing description. Retaining the strings for the names of the properties, actions and events is expensive for resource constrained devices. It is therefore appealing to be able to map these names to numeric symbols which can be used in place of the names, both by the application and for the abstract messages exchanged with the platform hosting the thing. These symbols are scoped to the thing, and the algorithm for the mapping needs to be deterministic way so that all parties agree on the mapping.

For devices where RAM is in short supply, it is appealing to be able to store literals in FLASH memory. This implies the desirability of a way to distinguish what is changeable from what is not. This is analogous to the use of "const" in C++. It would be useful with atomic and compound data.  Thing Descriptions should also make it possible for platforms to optimise the storage of data types, e.g. can a number be stored in a single byte or does it need more?  Can sets be represented as bit vectors?  In summary, Thing Descriptions should enable developers to provide information that platforms can use to optimise the storage and representation of data.

## An alternative approach

The description starts with a JSON object with properties for the thing's "properties", "actions" and "events". These are in turn JSON objects with the names for the corresponding properties, actions and events. For example:

```
{
    "@context" : "http://example.com/foo123",
    "properties" : {
    },
    "actions" : {
    },
    "events" : {
    } 
}
```

## Properties

A property is declared with its name and a JSON object with a set of annotations describing it, e.g.

```
"temp" : {
    "type" : "number",
    "min" : -20,
    "max" : 100,
    "units" : "celsius"
}
```

Where min and max act as constraints. Other common constraints include whether a given property is required or optional, whether null is allowed for the value, and for numbers a restriction to integer values. Enumerations could be expressed with an array of distinct values, e.g.

```
"fruit" : {
   "enum" : ["apple", "pear", "banana"]
}
```

If you don't need the annotations you can just give the type name as a short cut, e.g.

```
"switch" : "boolean"
```

For compound types, you can substitute the type name with a JSON object, e.g.

```
"location" : {
    "type" : {
       "lat": "number",
       "long" : "number"
    }
}
```

This can be used recursively for arbitrarily nested properties. Note that this can't be used together with the above short cut to avoid ambiguities between property names and annotations.

For situations where you need many properties with the same rich types, there is a means to declare this type once and refer to it, avoiding the need for redundant declarations, e.g.

```
"types" : {
    "temperature" : {
        "type" :  "number",
        "min" : -20,
        "max" : 100,
        "units" : "celsius"
    }
}
```

You can then refer to it using the name you just defined, e.g.

```
"temp1" : "temperature",
"temp2" : "temperature"
```

Of course you can use a JSON object when you need to use annotations, e.g. for the sensor location.

Note: an alternative would avoid the need for a separate "types" declaration and instead allow a reference to another property, e.g. "temp2" is declared to have the same type as "temp1".

```
"temp1" : {
        "type" :  "number",
        "min" : -20,
        "max" : 100,
        "units" : "celsius"
    },
"temp2" : "@temp1"
```
This could be generalised to allow paths for reuse of the types for sub-properties.

## Things as Values

If you want to declare a thing as the value for a given property you use "thing" as the type name, and "uri" for its description, e.g.

```
"door" : {
    "type" : "thing",
    "uri" : "http://example.com/thing/door12"
}
```
which refers to a specific door.  It may be convenient to use a shared thing description for a set of things, e.g. all of the guest room doors in a hotel. In such cases you can use "model" to refer to the shared description as in:

```
"door" : {
    "type" : "thing",
    "model" : "http://example.com/thing/door"
    "id" : "door12"
}
```

Note: I am not sure if "model" is the best name for this, perhaps "class"? Note also that "model" and "id" can also be used a the top level for a thing description.

## Events

Events are expressed in the same way as properties.

## Actions and Responses

Actions are a little more complicated since you need to specify the type for the actions input and output using "in" and "out" respectively, e.g.

```
"actions" : {
    "fade" : {
        "in" {
            "value" : "number",
            "time" : number
        }
        "out" : {
       }
    }
}
```
In this example "out" could have been left out since the action doesn't have any responses. A common annotation for "out" is whether it repeats, i.e. "repeats" : true.  Values for events, actions and responses can be things as per the earlier example for properties.

## Streams

Properties can be defined as streams with the addition of metadata for the sampling rate or sampling interval, e.g.

```
"properties" : {
    "acceleration" : {
        type = {
            "x" : "number",
            "y" : "number",
            "z" : "number"
        },
        "sps" : 250
    }
}
```
which defines a property named "acceleration" with 3 sub-properties giving the acceleration along the x, y and z axes. The "sps" annotation defines the number of samples per second.

## Mapping to RDF

The URI for the thing description is taken as the subject for all of the top level names. These names are mapped to URIs via the context and taken as the predicate. The object for these triples is assigned as a new blank node if the value is a JSON object, or a URI if the value is a type name, in which case the type name is mapped to the URI via the context. This process is recursively applied for nested properties.  There is a default context which is applies for names that are not given in the explicit context. As per JSON-LD, you can include "@context" in nested objects with the same operational semantics.

## Integrity constraints as expressions

To express richer constraints we may want to explore the use of operator expressions analogous to conditional expressions in programming languages. These could cover constraints that apply across properties, actions and events. It could also include cardinality constraints involving, for example, the number of items in an array. This would motivate a broadening of the syntax for JSON to allow for operator expressions as values, as otherwise, such expressions would need to be embedded within a string along with the need to escape double quote marks with a preceding backslash.

Even richer constraints are best expressed as ontologies for semantic models of particular application domains. A simple example would state if a thing is a temperature sensor then it must define its physical units as one of {kelvin, celsius, fahrenheit}. Such ontologies are analogous to schemas for thing descriptions, whereas a thing description is a schema for the data and interaction model exposed to applications.


