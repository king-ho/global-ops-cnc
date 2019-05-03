## Members

<dl>
<dt><a href="#command">command</a> : <code>Object</code></dt>
<dd><p>set bash commands</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#parseQuarantinePage">parseQuarantinePage(body)</a> ⇒ <code>array</code></dt>
<dd><p>[parseQuarantinePage]</p>
</dd>
<dt><a href="#isWholeNumber">isWholeNumber(value)</a> ⇒ <code>Boolean</code></dt>
<dd><p>[isWholeNumber]</p>
</dd>
<dt><a href="#extractPolicy">extractPolicy(rp)</a> ⇒ <code>object</code></dt>
<dd><p>[extractPolicy : extract policy for either the firewall or router rules and return JSON]</p>
</dd>
<dt><a href="#getRelevantPolicies">getRelevantPolicies(config, networkname)</a> ⇒ <code>array</code></dt>
<dd><p>[getRelevantPolicies : parse json object of policies and look for a network name in the comments]</p>
</dd>
<dt><a href="#changeNetworkToGateway">changeNetworkToGateway(network, gateway)</a> ⇒ <code>string</code></dt>
<dd><p>[changeQnetTo : irty static switching function for QNET gateway]</p>
</dd>
<dt><a href="#changeVpnTo">changeVpnTo(gateway)</a> ⇒ <code>string</code></dt>
<dd><p>[changeVpnTo : dirty static switching function for VPN gateway]</p>
</dd>
</dl>

<a name="command"></a>

## command : <code>Object</code>
set bash commands

**Kind**: global variable  
<a name="parseQuarantinePage"></a>

## parseQuarantinePage(body) ⇒ <code>array</code>
[parseQuarantinePage]

**Kind**: global function  
**Returns**: <code>array</code> - [array of quarantined mails]  

| Param | Type | Description |
| --- | --- | --- |
| body | <code>string</code> | [html string] |

<a name="isWholeNumber"></a>

## isWholeNumber(value) ⇒ <code>Boolean</code>
[isWholeNumber]

**Kind**: global function  
**Returns**: <code>Boolean</code> - [return true/false]  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>float</code> | [takes in number to check] |

<a name="extractPolicy"></a>

## extractPolicy(rp) ⇒ <code>object</code>
[extractPolicy : extract policy for either the firewall or router rules and return JSON]

**Kind**: global function  
**Returns**: <code>object</code> - [policy holding object]  

| Param | Type | Description |
| --- | --- | --- |
| rp | <code>string</code> | [string returned from cli call] |

<a name="getRelevantPolicies"></a>

## getRelevantPolicies(config, networkname) ⇒ <code>array</code>
[getRelevantPolicies : parse json object of policies and look for a network name in the comments]

**Kind**: global function  
**Returns**: <code>array</code> - [returns relevant policies]  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>object</code> | [policy object] |
| networkname | <code>string</code> | [name of network to search for] |

<a name="changeNetworkToGateway"></a>

## changeNetworkToGateway(network, gateway) ⇒ <code>string</code>
[changeQnetTo : irty static switching function for QNET gateway]

**Kind**: global function  
**Returns**: <code>string</code> - [return complete]  

| Param | Type | Description |
| --- | --- | --- |
| network | <code>object</code> | [network object to switch to] |
| gateway | <code>string</code> | [gateway name to switch to] |

<a name="changeVpnTo"></a>

## changeVpnTo(gateway) ⇒ <code>string</code>
[changeVpnTo : dirty static switching function for VPN gateway]

**Kind**: global function  
**Returns**: <code>string</code> - [return complete]  

| Param | Type | Description |
| --- | --- | --- |
| gateway | <code>string</code> | [gateway name to switch to] |

