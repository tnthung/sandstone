import { CommandNode } from '#core'
import { JSONTextComponentClass, targetParser } from '#variables'

import { CommandArguments } from '../../helpers'

import type { BASIC_COLORS, JSONTextComponent, MultipleEntitiesArgument } from '#arguments'

interface TeamOptions {
  collisionRule: 'always' | 'never' | 'pushOtherTeams' | 'pushOwnTeam'
  color: BASIC_COLORS
  deathMessageVisibility: 'never' | 'hideForOtherTeams' | 'hideForOwnTeam' | 'always'
  displayName: JSONTextComponent
  friendlyFire: boolean
  nametagVisibility: 'never' | 'hideForOtherTeams' | 'hideForOwnTeam' | 'always'
  prefix: JSONTextComponent
  seeFriendlyInvisibles: boolean

  /** Hey */
  suffix: JSONTextComponent
}

export class TeamCommandNode extends CommandNode {
  command = 'team' as const
}

export class TeamCommand extends CommandArguments {
  protected NodeType = TeamCommandNode

  /**
   * Creates a new team.
   *
   * @param team Specifies the name of the team.
   *
   * @param displayName Specifies the team name to be displayed.
   */
  add = (team: string, displayName?: JSONTextComponent) => this.finalCommand(['add', team, displayName ? new JSONTextComponentClass(displayName) : undefined])

  /**
   * Removes all members from a team.
   *
   * @param team Specifies the name of the team.
   */
  empty = (team: string) => this.finalCommand(['empty', team])

  /**
   * Makes specified entities join a team.
   *
   * @param team Specifies the name of the team.
   *
   * @param members Specifies the entities to join the team.
   * `'*'` may be used to represent all entities tracked by the scoreboard
   * If unspecified, defaults to the executor.
   */
  join = (team: string, members?: MultipleEntitiesArgument | '*') => this.finalCommand(['join', team, targetParser(members)])

  /**
   * Makes specified entities leave a team.
   *
   * @param members Specifies the entities to leave the team.
   * `'*'` may be used to represent all entities tracked by the scoreboard
   */
  leave = (members: MultipleEntitiesArgument | '*') => this.finalCommand(['leave', targetParser(members)])

  /**
   * Lists all teams, or lists all members of a team if `team` is set.
   *
   * @param team Specifies the name of the team.
   */
  list = (team?: string) => this.finalCommand(['list', targetParser(team)])

  modify: (
    /**
     * Modifies the option of the team.
     *
     * Value must be one of the following:
     *
     * - `collisionRule`: Decide what entities entities on this team can push.
     *
     * - `color`: Decide the color of the team and players in chat, above their head, on the Tab menu, and on the sidebar.
     * Also changes the color of the outline of the entities caused by the Glowing effect.
     *
     * - `deathMessageVisibility`: Decide whose death messages can be seen in chat.
     *
     * - `displayName`: Set the display name of the team.
     *
     * - `friendlyFire`: Enable/Disable players inflicting damage on each other when on the same team.
     * (Note: players can still inflict status effects on each other.) Does not affect non-player entities on a team.
     *
     * - `nametagVisibility`: Decide whose name tags above their heads can be seen.
     *
     * - `prefix`: Modifies the prefix that appears before players' names in chat.
     *
     * - `seeFriendlyInvisibles`: Decide if players can see invisible players on their team as semi-transparent or completely invisible.
     *
     * - `suffix`: Modifies the suffix that appears after players' names in chat.
     */
    (<T extends keyof TeamOptions>(team: string, option: T, value: TeamOptions[T]) => void) &

    /*
     * Here, for the 2nd overload, we can't do Exclude<string, keyof TeamOptions> because this doesn't work in Typescript.
     * We need T to capture the exact value of the string (like "foo"),
     * and the type of the parameter becomes Exclude<"foo", keyof TeamOptions> which works.
     */

    /**
     * Modifies the option of the team.
     *
     * Value must be one of the following:
     *
     * - `collisionRule`: Decide what entities entities on this team can push.
     *
     * - `color`: Decide the color of the team and players in chat, above their head, on the Tab menu, and on the sidebar.
     * Also changes the color of the outline of the entities caused by the Glowing effect.
     *
     * - `deathMessageVisibility`: Decide whose death messages can be seen in chat.
     *
     * - `displayName`: Set the display name of the team.
     *
     * - `friendlyFire`: Enable/Disable players inflicting damage on each other when on the same team.
     * (Note: players can still inflict status effects on each other.) Does not affect non-player entities on a team.
     *
     * - `nametagVisibility`: Decide whose name tags above their heads can be seen.
     *
     * - `prefix`: Modifies the prefix that appears before players' names in chat.
     *
     * - `seeFriendlyInvisibles`: Decide if players can see invisible players on their team as semi-transparent or completely invisible.
     *
     * - `suffix`: Modifies the suffix that appears after players' names in chat.
     */
    (<T extends string>(team: string, option: Exclude<T, keyof TeamOptions>, value: string) => void)
  ) = (...args: unknown[]) => this.finalCommand(['modify', ...args])

  /**
   * Removes a team.
   *
   * @param team Specifies the name of the team.
   */
  remove = (team: string) => this.finalCommand(['remove', team])
}
