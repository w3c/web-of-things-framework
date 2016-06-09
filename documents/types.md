# Proposal for the type system for Things

This describes a proposal for the type system for web of things applications, and is distinct from what takes place at the abstract messaging layer and specific protocol bindings. The aim is to describe the types independent of the choice of representation for thing descriptions.

Based upon the rich experience with event driven programming, the starting point is software objects that are exposed to applications, and which stand for a physical or abstract entity. These objects are the "things" in the web of things and have a URI as part of the W3C Resource Description Framework. 

## Things

Things may have a combination of metadata, properties, actions and events:

## Properties

Things may have zero or more properties. Each property has a distinct name and a value. 

## Actions

Things may have zero or more actions. These correspond to asynchronous methods. Applications can invoke named actions passing a value. Actions are associated with a sequence of zero or more responses which may carry a value. In principle, actions and responses could carry multiple values. Programming languages support positional arguments and named arguments.  However, given the ability to provide compound values with named fields, this extra complexity may not be justified.  The way in which responses are passed to applications could vary. One approach involves passing a call back to the action when invoking it. Another involves the action synchronously returning a "Promise" upon which the application can declare handlers.

## Events

Things may have zero or more events. Objects can raise events to notify applications when something has happened, for example, an indicator light has failed.  Events have a name and a value.  Applications can register call backs for events with the same name. In principle, this could be extended to allow applications can register for a named collection of event names. One way to do that is with compound names and wild cards.

## Values

Each value has a type. The core types include:

* **null**: this denotes the absence of a value
* **boolean**: either true or false
* **number**: including integers and floating point
* **string**: a sequence of UTF-8 characters

The following are anonymous compound types which can be nested to arbitrary depths:

* **object**: a set of name/value pairs, possibly empty
* **array**: a sequence of values, possibly empty

In addition, I propose to have things and streams as first class types, i.e. you can assign them to properties, pass them through events, when invoking actions or in responses to actions. Things are as defined above. Streams are an interface to a time sequence of values. 

At the minimum, this interface should provide the means to iterate through the sequence. Streams may further provide metadata, e.g. the interval between streamed values or the timestamp for a value when available. Streams are often associated with a buffer, so that you can look back at past values. Streams may provide a means to query the buffer size, and to access a value at a particular time, or to obtain an iterator for a given window of time.

The type system needs to support both early and late binding, where the type is only partially known in advance and has to be fully determined at run time. This is analogous to unions in C++ where a tag value is used to determine which of the variant types applies. It would be useful to be able to declare a value as conforming to a given class or set of types. For late bound things, the platform will need to dereference the thing's description to construct the corresponding object.

Things may be associated with constraints. This can include constraints on single values, e.g. min and max values for a number, whether the number is a integer, the precision of a floating point number and so forth.  String values could be constrained to be members of a given set.

Richer integrity constraints can be modelled as an expression over values that should evaluate to true. Such expressions should be side effect free.  It is generally the case, that such expressions can include a range of predefined operators, e.g. boolean operators, numerical comparisons, string operators and so forth. A predefined set of named functions may be provided, e.g. to return the number of items in an array.

Integrity constraints can be used to restrict values and may apply across properties, actions and events.  Integrity constraints may be seen as analogous to the use of "assert" statements in programming languages where the developer wants to know when something is wrong, and to avoid the programming continuing when that happens. For the web of things, integrity constraints can be used to increase resilience in the presence of faults and bad data.

Things also have metadata and semantic descriptions that state semantic constraints on given kinds of things. This will be covered in a separate note.

