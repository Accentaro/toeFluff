// Scoped to Discord's Tabs and its own tab items; no global colour-token patch.
export function tabPluginImports() {
	return `import { Design } from '@valenced/discord/design'
import { insteadJSX } from '@valenced/react/jsx-runtime'
import { Children, cloneElement, createElement, isValidElement, useSyncExternalStore } from 'react'
import type { ComponentProps, FC, ReactElement, ReactNode } from 'react'
import { StyleSheet } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
`
}
export function tabPluginCode(tabs) {
	return `
const tabStyle: Partial<Record<'row' | 'text' | 'indicator', string>> = ${JSON.stringify(tabs, null, '\t')}
type NodeProps = { children?: ReactNode; style?: StyleProp<ViewStyle>; animated?: boolean; contentContainerStyle?: StyleProp<ViewStyle> }
type ItemProps = NodeProps & { selected: boolean; index: number; state: unknown; label: string }
let styling = false
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
let originalTabs: typeof Design.Tabs
const itemWrappers = new Map<FC<ItemProps>, FC<ItemProps>>()
function styleItem(node: ReactNode): ReactNode {
	if (!isValidElement<NodeProps>(node)) return node
	const item = node as ReactElement<ItemProps>
	if (typeof item.type === 'function' && typeof item.props.index === 'number' && typeof item.props.selected === 'boolean' && item.props.state && typeof item.props.label === 'string') {
		const Original = item.type as FC<ItemProps>
		let Styled = itemWrappers.get(Original)
		if (!Styled) {
			Styled = props => {
				const enabled = useSyncExternalStore(subscribe, () => styling)
				const result = Original(props) as ReactElement<NodeProps>
				if (!enabled || !isValidElement(result)) return result
				const color = tabStyle.text
				return cloneElement(result, {}, Children.map(result.props.children, child =>
					color && isValidElement<NodeProps>(child) ? cloneElement(child, { animated: false, style: { color } as ViewStyle }) : child))
			}
			itemWrappers.set(Original, Styled)
		}
		return createElement(Styled, { ...item.props, key: item.key })
	}
	// The indicator sits inside the absolute overlay; keep its animated width and position.
	if (tabStyle.indicator && StyleSheet.flatten(node.props.style)?.position === 'absolute') {
		return cloneElement(node, {}, Children.map(node.props.children, child =>
			isValidElement<NodeProps>(child) ? cloneElement(child, { style: [child.props.style, { backgroundColor: tabStyle.indicator }] }) : child))
	}
	return cloneElement(node, {}, Children.map(node.props.children, styleItem))
}
function StyledTabs(props: ComponentProps<typeof Design.Tabs>) {
	const enabled = useSyncExternalStore(subscribe, () => styling)
	const result = originalTabs(props) as ReactElement<NodeProps>
	if (!enabled || !isValidElement(result)) return result
	return cloneElement(result, { ...(tabStyle.row ? { style: [result.props.style, { backgroundColor: tabStyle.row }], contentContainerStyle: [result.props.contentContainerStyle, { paddingTop: 12 }] } : {}) }, Children.map(result.props.children, styleItem))
}
`
}
export const tabPluginStart = `
	start({ cleanup, plugin: self }) {
		originalTabs = Design.Tabs
		styling = true
		cleanup(insteadJSX(Design.Tabs, ([, props, key], jsx) => jsx(StyledTabs, props, key)))
		cleanup(() => { styling = false; for (const listener of listeners) listener(); itemWrappers.clear() })
		if (self.startedLate) self.requireReload()
	},
`
